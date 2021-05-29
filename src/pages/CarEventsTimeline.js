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
      events: [],
      db_events: []
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
          let db_events = [];
          this.setState({ cars }, () => {
            if (this.state.selectedCar !== undefined) {
              let fills = this.get_fills_of_a_car(this.state.selectedCar);
              let logs = this.get_logs_of_a_car(this.state.selectedCar);
              if (fills !== undefined) {
                Object.values(fills).forEach(fill =>
                  db_events.push({ fill: fill, odometer: fill.odometer })
                );
              }
              if (logs !== undefined) {
                Object.values(logs).forEach(log =>
                  db_events.push({ log: log, odometer: log.odometer })
                );
              }

              let tmp2 = Object.values(db_events).sort(
                this.compare_events_by_odometer_desc
              );

              this.setState({ db_events: tmp2 });
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

    let db_events = [];

    try {
      let fills = this.get_fills_of_a_car(id);
      let logs = this.get_logs_of_a_car(id);
      if (fills !== undefined) {
        Object.values(fills).forEach(fill =>
          db_events.push({ fill: fill, odometer: fill.odometer })
        );
      }
      if (logs !== undefined) {
        Object.values(logs).forEach(log =>
          db_events.push({ log: log, odometer: log.odometer })
        );
      }

      let tmp2 = Object.values(db_events).sort(
        this.compare_events_by_odometer_desc
      );

      this.setState({ db_events: tmp2 });
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
    return event;
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
    return event;
  }

  get_timeline_events() {
    let ev = [];
    let eventslength = this.state.db_events.length;
    let events = this.state.db_events;

    if (eventslength > 1) {
      console.log('OMG33');
      Object.values(events).forEach(event => {
        if ('fill' in event) {
          ev.push(
            this.create_fill_event(
              event.fill.fuelamount,
              event.fill.price,
              event.fill.odometer,
              event.fill.timestamp,
              event.fill.fuel_efficiency
            )
          );
        } else if ('log' in event) {
          ev.push(
            this.create_log_event(
              event.log.what,
              event.log.price,
              event.log.odometer,
              event.log.timestamp,
              event.log.user,
              event.log.who
            )
          );
        }
      });
    }
    return ev;
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
