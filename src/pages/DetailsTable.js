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
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import { show_toast_failure, show_toast_success } from '../helpers/toast';
import {
  time_formatter,
  fuel_efficiency_formatter,
  fuel_amount_formatter,
  odometer_formatter,
  price_formatter
} from '../helpers/datatable_formatters';

export default class DetailsTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: auth().currentUser,
      datatable_rows: [],
      user_settings: {},
      cars: [],
      filtered_cars: [],
      owned_cars: [],
      fuelamount: '',
      odometer: '',
      price: '',
      selectedCar: '',
      readError: null,
      writeError: null,
      width: 0,
      height: 0,
      window_width_where_table_content_is_hidden: 1000
    };

    this.handleSubmit = this.handleSubmit.bind(this);
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

          this.setState({ cars },() => {
            if (this.state.selectedCar !== undefined){
              let tmp = this.get_fills_of_a_car(this.state.selectedCar);
              if (tmp !== undefined){
                console.log('asdf')
                let tmp2 = Object.values(tmp).sort(this.compare_fills_by_odometer_desc);
                this.setState({datatable_rows: tmp2})

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

  compare_fills_by_odometer(a, b) {
    // Use toUpperCase() to ignore character casing
    const fillA = parseInt(a.odometer, 10);
    const fillB = parseInt(b.odometer, 10);

    let comparison = 0;
    if (fillA > fillB) {
      comparison = 1;
    } else if (fillA < fillB) {
      comparison = -1;
    }
    return comparison;
  }

  compare_fills_by_odometer_desc(a, b) {
    // Use toUpperCase() to ignore character casing
    const fillA = parseInt(a.odometer, 10);
    const fillB = parseInt(b.odometer, 10);

    let comparison = 0;
    if (fillA > fillB) {
      comparison = -1;
    } else if (fillA < fillB) {
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

  async handleSubmit(event) {
    event.preventDefault();
    this.setState({ writeError: null });

    let ordered_fills = this.state.datatable_rows.sort(this.compare_fills_by_odometer_desc);
    let average_consumption_of_leg = 0;
    try {
      average_consumption_of_leg = this.calculate_fuel_consumption_of_leg(
        this.state.fuelamount,
        this.state.odometer,
        ordered_fills[ordered_fills.length - 1].odometer
      );
    } catch (error) {
      average_consumption_of_leg = 0;
    }

    if (
      this.state.fuelamount === '' ||
      this.state.odometer === '' ||
      this.state.price === ''
    ) {
      show_toast_failure('Angaben inkomplett');
      return;
    }

    try {
      if (this.state.selectedCar !== '') {
        await db.ref('cars/' + this.state.selectedCar + '/fills').push({
          fuelamount: this.state.fuelamount,
          odometer: this.state.odometer,
          price: this.state.price,
          timestamp: Date.now(),
          user: this.state.user_settings.UserName,
          fuel_efficiency: average_consumption_of_leg
        });
        this.setState({ fuelamount: '', odometer: '', price: '' });

        show_toast_success('Tiptop, ⌀ ' + average_consumption_of_leg + ' l/km');
      } else {
        this.setState({ writeError: 'please select a car first.' });
        show_toast_failure('No Car selected');
      }
    } catch (error) {
      this.setState({ writeError: error.message });
    }
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
        datatable_rows: Object.values(this.get_fills_of_a_car(id))
      });
    } catch (error) {
      console.log('no fills available');
      this.setState({ datatable_rows: [] });
    }

    this.setState({ fuelamount: '', odometer: '', price: '' });
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

  render() {
    let fill_columns = [
      {
        dataField: 'id',
        text: 'Id',
        hidden: true
      },
      {
        dataField: 'odometer',
        text: 'Kilometer',
        sort: true,
        formatter: odometer_formatter,
        type: 'number'
      },
      {
        dataField: 'fuelamount',
        text: 'Benzin',
        sort: true,
        formatter: fuel_amount_formatter,
        type: 'number'
      },
      {
        dataField: 'price',
        text: 'Preis',
        sort: true,
        formatter: price_formatter,
        type: 'number'
      },
      {
        dataField: 'timestamp',
        text: 'Datum',
        formatter: time_formatter,
        sort: true
      },
      {
        dataField: 'user',
        text: 'Wer',
        sort: true
      },
      {
        dataField: 'fuel_efficiency',
        text: 'Verbrauch',
        sort: true,
        formatter: fuel_efficiency_formatter
      }
    ];

    if (
      this.state.width < this.state.window_width_where_table_content_is_hidden
    ) {
      fill_columns[4].hidden = true; // timestamp
      fill_columns[5].hidden = true; // Wer
      fill_columns[6].hidden = true; // Verbrauch
    }

    const defaultSorted = [
      {
        dataField: 'odometer',
        order: 'desc'
      }
    ];
    const selectRow = {
      mode: 'checkbox',
      clickToSelect: false,
      hideSelectAll: true,
      onSelect: (row, isSelect, rowIndex, e) => {
        this.delete_fill(row, isSelect);
      }
    };
    return (
      <div className="m-5">
        <Header />
        <Container>
          <Row>
            <ToastContainer
              position="bottom-center"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </Row>
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
            <h2>Tankungen</h2>
            <BootstrapTable
              keyField="id"
              data={this.state.datatable_rows}
              columns={fill_columns}
              striped
              hover
              condensed
              bordered={false}
              //defaultSorted={defaultSorted}
              noDataIndication="Table is Empty"
              pagination={paginationFactory()}
              cellEdit={cellEditFactory({
                mode: 'click',
                onStartEdit: (row, column, rowIndex, columnIndex) => {
                  console.log('onStartEdit Cell!!');
                },
                beforeSaveCell: (oldValue, newValue, row, column) => {
                  console.log('Before Saving Cell!!');
                },
                afterSaveCell: (oldValue, newValue, row, column) => {
                  this.update_fill(oldValue, newValue, row, column);
                }
              })}
              selectRow={selectRow}
            />
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