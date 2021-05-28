import React, { Component } from 'react';
import Header from '../components/Header';
import { auth } from '../services/firebase';
import { db } from '../services/firebase';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import { Container, Row, Col } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import { ListGroup } from 'react-bootstrap';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';
import cellEditFactory from 'react-bootstrap-table2-editor';
import { confirmAlert } from 'react-confirm-alert'; // Import
import 'react-confirm-alert/src/react-confirm-alert.css'; // Import css
import {
  VerticalTimeline,
  VerticalTimelineElement
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';

import {
  time_formatter,
  fuel_efficiency_formatter,
  fuel_amount_formatter,
  odometer_formatter,
  price_formatter
} from '../helpers/datatable_formatters';

export default class CarEventsTimeline extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: auth().currentUser,
      user_settings: {},
      cars: [],
      filtered_cars: [],
      owned_cars: [],
      selectedCar: '',
      readError: null,
      writeError: null,
      width: 0,
      height: 0,
      events: []
    };

    this.car_selected = this.car_selected.bind(this);

    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
  }

  async componentDidMount() {
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);

    return new Promise((resolve, reject) => {
      return db
        .ref('user_settings/' + this.state.user.uid)
        .on('value', snapshot => {
          let user_settings = {};

          snapshot.forEach(snap => {
            if (snap.key === 'selectedCar') {
              this.setState({ selectedCar: snap.val() });
            }
            user_settings[snap.key] = snap.val();
          });

          this.setState({ user_settings });
          resolve();
        });
    })
      .then(step2 => {
        db.ref('user_settings/' + this.state.user.uid + '/ownedCars').on(
          'value',
          snapshot => {
            let owned_cars = [];
            //console.log("owned")
            snapshot.forEach(snap => {
              owned_cars.push(snap.val()['id']);
            });
            this.setState({ owned_cars });
          }
        );
      })
      .then(step3 => {
        db.ref('cars').on('value', snapshot => {
          let cars = [];
          snapshot.forEach(snap => {
            cars.push(snap.val());
            cars[cars.length - 1].car_id = snap.key;
          });

          let filtered_cars = this.filter_to_only_owned_cars(cars);
          this.setState({ filtered_cars });

          this.setState({
            events: []
          });

          this.setState({ cars }, () => {
            if (this.state.selectedCar !== undefined) {
              let fills = this.get_fills_of_a_car(this.state.selectedCar);
              let logs = this.get_logs_of_a_car(this.state.selectedCar);
              if (fills !== undefined) {
                Object.values(fills).forEach(fill =>
                  this.create_fill_event(
                    fill.fuelamount,
                    fill.price,
                    fill.odometer,
                    fill.timestamp,
                    fill.fuel_efficiency
                  )
                );
              }
              if (logs !== undefined) {
                Object.values(logs).forEach(log =>
                  this.create_log_event(
                    log.what,
                    log.price,
                    log.odometer,
                    log.timestamp,
                    log.user,
                    log.who
                  )
                );
              }
            }
          });
        });
      });
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions);
  }

  updateWindowDimensions() {
    this.setState({ width: window.innerWidth, height: window.innerHeight });
  }

  filter_to_only_owned_cars(cars) {
    let filtered_cars = [];

    cars.forEach(car => {
      if (this.state.owned_cars.includes(car['car_id']) === true) {
        filtered_cars.push(car);
      }
    });

    return filtered_cars;
  }

  compare_events_by_odometer(a, b) {
    // Use toUpperCase() to ignore character casing
    const eventA = parseInt(a.odometer, 10);
    const eventB = parseInt(b.odometer, 10);

    let comparison = 0;
    if (eventA > eventB) {
      comparison = 1;
    } else if (eventA < eventB) {
      comparison = -1;
    }
    return comparison;
  }

  compare_events_by_odometer_desc(a, b) {
    // Use toUpperCase() to ignore character casing
    const eventA = parseInt(a.odometer, 10);
    const eventB = parseInt(b.odometer, 10);

    let comparison = 0;
    if (eventA > eventB) {
      comparison = -1;
    } else if (eventA < eventB) {
      comparison = 1;
    }
    return comparison;
  }

  calculate_fuel_consumption_of_leg(fuelamount, odometer, ref_odometer) {
    let average_consumption = 0;

    average_consumption = fuelamount / (odometer - ref_odometer);
    average_consumption = Number((average_consumption * 100).toFixed(1));

    return average_consumption;
  }

  get_car_by_id(car_id) {
    let retval = undefined;
    this.state.filtered_cars.forEach(car => {
      if (car.car_id === car_id) {
        retval = car;
      }
    });
    return retval;
  }

  formatCar(car_id) {
    let name = '';

    if (car_id !== '') {
      let car = this.get_car_by_id(car_id);
      if (car !== undefined) {
        name = car.name;
      }
    }
    return name;
  }

  carFormatter(cell, row, rowIndex, formatExtraData) {
    let name = '';

    if (cell !== '') {
      formatExtraData.forEach(car => {
        if (car.car_id === cell) {
          name = car.name;
        }
      });
    }
    return name;
  }

  async car_selected(id) {
    this.setState({ selectedCar: id });
    this.setState({ writeError: null });

    try {
      await db.ref('user_settings/' + this.state.user.uid).update({
        selectedCar: id
      });
    } catch (error) {
      this.setState({ writeError: error.message });
    }

    try {
      this.setState({
        events: []
      });

      Object.values(this.get_fills_of_a_car(id)).forEach(fill =>
        this.create_fill_event(
          fill.fuelamount,
          fill.price,
          fill.odometer,
          fill.timestamp,
          fill.fuel_efficiency
        )
      );
      Object.values(this.get_logs_of_a_car(id)).forEach(log =>
        this.create_log_event(
          log.what,
          log.price,
          log.odometer,
          log.timestamp,
          log.user,
          log.who
        )
      );
    } catch (error) {
      console.log('no fills available');
    }
  }

  get_fills_of_a_car(car_id) {
    let fills = [];
    if (car_id !== undefined && car_id !== '') {
      fills = this.get_car_by_id(this.state.selectedCar).fills;
    }

    //add property id to each fill
    try {
      Object.keys(fills).forEach(function(fill) {
        fills[fill]['id'] = fill;
      });
    } catch (error) {
      console.log('can not read any fills');
    }

    return fills;
  }

  get_logs_of_a_car(car_id) {
    let logs = [];
    if (car_id !== undefined && car_id !== '') {
      logs = this.get_car_by_id(this.state.selectedCar).logs;
    }

    //add property id to each log
    try {
      Object.keys(logs).forEach(function(log) {
        logs[log]['id'] = log;
      });
    } catch (error) {
      console.log('can not read any logs');
    }

    return logs;
  }

  async update_fill(oldValue, newValue, row, column) {
    try {
      if (!row.hasOwnProperty('fuel_efficiency')) {
        row.fuel_efficiency = '-';
      }

      await db
        .ref('cars/' + this.state.selectedCar + '/fills/' + row['id'])
        .update({
          price: row['price'],
          odometer: row['odometer'],
          fuelamount: row['fuelamount'],
          timestamp: parseInt(row['timestamp']),
          user: row['user'],
          fuel_efficiency: row['fuel_efficiency']
        });
    } catch (error) {
      this.setState({ updateError: error.message });
    }
  }

  async del_db_fill_entry(id) {
    try {
      await db.ref('cars/' + this.state.selectedCar + '/fills/' + id).remove();
    } catch (error) {
      this.setState({ updateError: error.message });
    }
  }

  async delete_fill(row, isSelect) {
    if (isSelect === true) {
      confirmAlert({
        title: 'Confirm to delete',
        message: 'Are you sure to delete this fill from the db?',
        buttons: [
          {
            label: 'Yes',
            onClick: () => {
              this.del_db_fill_entry(row['id']);
            }
          },
          {
            label: 'No'
          }
        ]
      });
    }
  }

  create_fill_event(
    fuelamount = 0,
    price = 0,
    odometer = 0,
    timestamp = 0,
    fuel_efficiency = 0
  ) {
    let event = (
      <VerticalTimelineElement
        className="vertical-timeline-element--work"
        contentStyle={{
          background: 'rgb(33, 150, 243)',
          color: '#fff'
        }}
        contentArrowStyle={{
          borderRight: '7px solid  rgb(33, 150, 243)'
        }}
        date={time_formatter(timestamp)}
        iconStyle={{ background: 'rgb(33, 150, 243)', color: '#fff' }}
      >
        <h3 className="vertical-timeline-element-title">Tankung</h3>
        <div>Menge: {fuel_amount_formatter(fuelamount)}</div>
        <div>Kilometerstand: {odometer_formatter(odometer)}</div>
        <div>Preis: {price_formatter(price)}</div>
        <div>Verbrauch: {fuel_efficiency_formatter(fuel_efficiency)}</div>
      </VerticalTimelineElement>
    );

    this.add_timeline_event(event);
  }

  create_log_event(
    what = '',
    price = 0,
    odometer = 0,
    timestamp = 0,
    user = '',
    who = ''
  ) {
    let event = (
      <VerticalTimelineElement
        className="vertical-timeline-element--work"
        contentStyle={{
          background: 'rgb(242, 157, 24)',
          color: '#fff'
        }}
        contentArrowStyle={{
          borderRight: '7px solid  rgb(242, 157, 24)'
        }}
        date={time_formatter(timestamp)}
        iconStyle={{ background: 'rgb(242, 157, 24)', color: '#fff' }}
      >
        <h3 className="vertical-timeline-element-title">Log</h3>
        <div>Was: {what}</div>
        <div>Kilometerstand: {odometer_formatter(odometer)}</div>
        <div>Preis: {price_formatter(price)}</div>
        <div>Ausgeführt durch: {who}</div>
        <div>Erfasser: {user}</div>
      </VerticalTimelineElement>
    );

    this.add_timeline_event(event);
  }

  add_timeline_event(event) {
    //this.setState(previousState => ({
    //  events: [...previousState.events, event]
    //}));

    let events = this.state.events;
    events = events.concat(event);
    let tmp2 = Object.values(events).sort(this.compare_events_by_odometer_desc);
    console.log(tmp2)
    this.setState({ events:tmp2 });
  }

  get_timeline_events() {
    console.log(this.state.events);
    return this.state.events;
  }

  render() {
    return (
      <div className="m-5">
        <Header />
        <Container>
          <Row>
            <div className="py-1 m-3">
              <Dropdown>
                <Dropdown.Toggle variant="primary" id="dropdown-carselection">
                  {this.formatCar(this.state.selectedCar)}
                </Dropdown.Toggle>

                <Dropdown.Menu onClick={e => this.car_selected(e.target.id)}>
                  {this.state.filtered_cars.map(car => {
                    return (
                      <Dropdown.Item id={car.car_id} key={car.car_id}>
                        {car.name}
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Row>
          <Row>
            <h2>Events</h2>
            <VerticalTimeline>{this.get_timeline_events()}</VerticalTimeline>
          </Row>
          <Row>
            <div className="py-5 mx-3">
              Logged in as:{' '}
              <strong className="text-info">
                {this.state.user_settings.UserName}
              </strong>
            </div>
          </Row>
        </Container>
      </div>
    );
  }
}
