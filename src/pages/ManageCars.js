import React, { Component } from 'react';
import Header from '../components/Header';
import { auth } from '../services/firebase';
import { db } from '../services/firebase';
import {onValue, ref, remove, update} from "firebase/database";
import Form from 'react-bootstrap/Form';
import { Container, Row, Col } from 'react-bootstrap';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import BootstrapTable from 'react-bootstrap-table-next';
import cellEditFactory from 'react-bootstrap-table2-editor';
import Button from 'react-bootstrap/Button';
import { confirmAlert } from 'react-confirm-alert'; // Import
import 'react-confirm-alert/src/react-confirm-alert.css'; // Import css

export default class Overview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: auth.currentUser,
      cars: [],
      filtered_cars: [],
      name: '',
      brand: '',
      model: '',
      plate: '',
      readError: null,
      writeError: null,
      loadingCars: false
    };
    this.handleChange_Name = this.handleChange_Name.bind(this);
    this.handleChange_Brand = this.handleChange_Brand.bind(this);
    this.handleChange_Model = this.handleChange_Model.bind(this);
    this.handleChange_Plate = this.handleChange_Plate.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  async componentDidMount() {
    this.setState({ readError: null, loadingCars: true });

    const user_settings = ref(db, 'user_settings/' + this.state.user.uid);
    onValue(user_settings, snapshot => {
      let user_settings = {};
      let owned_cars = [];
      let selected_car = {};
      console.log("onValue db.user_settings");

      snapshot.forEach(snap => {
        if (snap.key === 'selectedCar') {
          selected_car = snap.val();
        } else if (snap.key === 'ownedCars') {
          for (const [key, value] of Object.entries(snap.val())) {
            owned_cars.push(value['id']);
          }
          ;
        }
        user_settings[snap.key] = snap.val();
      });

      this.setState({
        "user_settings": user_settings,
        "owned_cars": owned_cars,
        "selectedCar": selected_car
      }, () => {
        const cars = ref(db, 'cars');
        onValue(cars, snapshot => {
          let cars = [];
          console.log("onValue db.cars")

          snapshot.forEach(snap => {
            cars.push(snap.val());
            cars[cars.length - 1].id = snap.key;
            cars[cars.length - 1].key = snap.key;
            console.log(snap.key);
          });

          let filtered_cars = this.filter_to_only_owned_cars(cars);
          this.setState({
            "filtered_cars": filtered_cars,
            "cars": cars
          });
        });
      });
    });
  }

  filter_to_only_owned_cars(cars) {
    let filtered_cars = [];

    cars.forEach(car => {
      if (this.state.owned_cars.includes(car['id']) === true) {
        filtered_cars.push(car);
      }
    });

    return filtered_cars;
  }

  handleChange_Name(event) {
    this.setState({
      name: event.target.value
    });
  }

  handleChange_Brand(event) {
    this.setState({
      brand: event.target.value
    });
  }

  handleChange_Model(event) {
    this.setState({
      model: event.target.value
    });
  }

  handleChange_Plate(event) {
    this.setState({
      plate: event.target.value
    });
  }

  async handleSubmit(event) {
    event.preventDefault();
    this.setState({ writeError: null });

    try {
      db.ref('cars')
        .push({
          name: this.state.name,
          brand: this.state.brand,
          model: this.state.model,
          plate: this.state.plate,
          timestamp: Date.now()
        })
        .then(id => {
          db.ref('user_settings/' + this.state.user.uid + '/ownedCars').push({
            id: id.key
          });

          db.ref('user_settings/' + this.state.user.uid).update({
            selectedCar: id.key
          });
          //resolve();
        });

      this.setState({ name: '', brand: '', model: '', plate: '' });
    } catch (error) {
      this.setState({ writeError: error.message });
    }
  }

  formatTime(timestamp) {
    const d = new Date(timestamp);
    const time = `${d.getDate()}/${d.getMonth() +
      1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}`;
    return time;
  }

  async update_car(oldValue, newValue, row, column) {
    try {
      await update(ref(db, 'cars/' + row['id']), {
        name: row['name'],
        brand: row['brand'],
        model: row['model'],
        plate: row['plate']
      });
    } catch (error) {
      this.setState({ updateError: error.message });
    }
  }

  async del_db_car_entry(id) {
    const mPostReference = await db.ref(
      'user_settings/' + this.state.user.uid + '/ownedCars/'
    );
    const snapshot = await mPostReference.once('value');
    const value = snapshot.val();
    let ids_to_remove = [];

    Object.entries(value).forEach(entry => {
      if (id === entry[1]['id']) {
        ids_to_remove.push(entry[0]);
      }
    });

    try {
      //first remove car from db.cars
      db.ref('cars/' + id)
        .remove()
        //then remove car id from owned cars
        .then(value => {
          ids_to_remove.forEach(idtrm => {
            console.log('idtrm : ' + id);
            db.ref(
              'user_settings/' + this.state.user.uid + '/ownedCars/' + idtrm
            ).remove();
          });
        });
    } catch (error) {
      this.setState({ updateError: error.message });
    }
  }

  async delete_car(row, isSelect) {
    if (isSelect === true) {
      confirmAlert({
        title: 'Confirm to delete',
        message: 'Are you sure to delete this car from the db?',
        buttons: [
          {
            label: 'Yes',
            onClick: () => {
              this.del_db_car_entry(row['id']);
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
    const car_columns = [
      {
        dataField: 'id',
        text: 'Id',
        hidden: true
      },
      {
        dataField: 'name',
        text: 'Name',
        sort: true
      },
      {
        dataField: 'brand',
        text: 'Brand',
        sort: true
      },
      {
        dataField: 'model',
        text: 'Model',
        sort: true
      },
      {
        dataField: 'plate',
        text: 'Plate',
        sort: true
      }
    ];
    const defaultSorted = [
      {
        dataField: 'name',
        order: 'desc'
      }
    ];
    const selectRow = {
      mode: 'checkbox',
      clickToSelect: false,
      hideSelectAll: true,
      onSelect: (row, isSelect, rowIndex, e) => {
        this.delete_car(row, isSelect);
      }
    };
    return (
      <div className="m-5">
        <Header />
        <Container>
          <Row>
            <div className="m-5">
              <h2>Your cars</h2>
            </div>
          </Row>
          <Row>
            <BootstrapTable
              keyField="id"
              data={this.state.cars}
              columns={car_columns}
              striped
              hover
              condensed
              bordered={false}
              defaultSorted={defaultSorted}
              noDataIndication="Table is Empty"
              //pagination={ paginationFactory() }
              cellEdit={cellEditFactory({
                mode: 'click',
                onStartEdit: (row, column, rowIndex, columnIndex) => {
                  console.log('onStartEdit Cell!!');
                },
                beforeSaveCell: (oldValue, newValue, row, column) => {
                  console.log('Before Saving Cell!!');
                },
                afterSaveCell: (oldValue, newValue, row, column) => {
                  this.update_car(oldValue, newValue, row, column);
                }
              })}
              selectRow={selectRow}
            />
          </Row>
          <Row>
            <div className="px-3" />
          </Row>
          <Row>
            <h2>Add new car</h2>
            <Form onSubmit={this.handleSubmit}>
              <div className="px-3">
                <Row>
                  <Form.Group as={Col} controlId="car_name_id">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      onChange={this.handleChange_Name}
                      value={this.state.name}
                    />
                  </Form.Group>

                  <Form.Group as={Col} controlId="car_brand_id">
                    <Form.Label>Marke</Form.Label>
                    <Form.Control
                      onChange={this.handleChange_Brand}
                      value={this.state.brand}
                    />
                  </Form.Group>

                  <Form.Group as={Col} controlId="car_model_id">
                    <Form.Label>Modell</Form.Label>
                    <Form.Control
                      onChange={this.handleChange_Model}
                      value={this.state.model}
                    />
                  </Form.Group>

                  <Form.Group as={Col} controlId="car_plate_id">
                    <Form.Label>Kennzeichen</Form.Label>
                    <Form.Control
                      onChange={this.handleChange_Plate}
                      value={this.state.plate}
                    />
                  </Form.Group>
                </Row>
              </div>
              <div className="px-3">
                <Button variant="primary" className="px-5" type="submit">
                  Submit
                </Button>
              </div>
            </Form>
          </Row>
          <Row>
            <div className="py-5 mx-3">
              Logged in as:{' '}
              <strong className="text-info">{this.state.user.email}</strong>
            </div>
          </Row>
        </Container>
      </div>
    );
  }
}
