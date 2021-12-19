import React, { Component } from "react";
import Header from "../components/Header";
import { auth } from "../services/firebase";
import { db } from "../services/firebase";
import {onValue, push, ref, remove, update} from "firebase/database";
import Form from 'react-bootstrap/Form'
import { Container, Row, Col } from 'react-bootstrap';
import Button from 'react-bootstrap/Button'
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import BootstrapTable from 'react-bootstrap-table-next';
//import paginationFactory from 'react-bootstrap-table2-paginator';
import cellEditFactory from 'react-bootstrap-table2-editor';
import { confirmAlert } from 'react-confirm-alert'; // Import


export default class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: auth.currentUser,
      properties: [],
      user_settings: {},
      owned_cars: [],
      readError: null,
      writeError: null,
      loadingCars: false,
      car_id: "",
      };

    this.handleChange_CarID = this.handleChange_CarID.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

  }

  handleChange_CarID(event){
    this.setState({
      car_id: event.target.value
    });
  }

  async handleSubmit(event) {
    event.preventDefault();
    this.setState({ writeError: null });

    try {
      await push(ref(db, 'user_settings/' + this.state.user.uid + "/ownedCars"), {
        id: this.state.car_id,
      });
      this.setState({ car_id: '' });
    } catch (error) {
      this.setState({ writeError: error.message });
    }
  }

  async componentDidMount() {
    this.setState({ readError: null, loadingCars: true });

    try {
      const user_settings = ref(db, 'user_settings/' + this.state.user.uid);
      onValue(user_settings, snapshot => {
        let properties = [];
        let owned_cars = [];
        let user_settings = {};

        snapshot.forEach((snap) => {
          let property = {};

          if(snap.key === 'ownedCars'){
            //console.log(snap.val())
            Object.entries(snap.val()).forEach((entry) =>{
              let owned_car = {};
              owned_car['id'] = entry[0];
              owned_car['car_id'] = entry[1]['id'];
              owned_cars.push(owned_car);
            });
          }else{
            property['property'] = snap.key
            property['value'] = snap.val()
            property['id'] = Math.round(Math.random() * 100000)
            properties.push(property);

            user_settings[snap.key] = snap.val()
          }
        });

        this.setState({ properties });
        this.setState({ user_settings });
        this.setState({owned_cars});
        this.setState({ loadingCars: false });
      });
    } catch (error) {
      this.setState({ readError: error.message, loadingCars: false });
    }
  }

  formatTime(timestamp) {
    const d = new Date(timestamp);
    const time = `${d.getDate()}/${(d.getMonth()+1)}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}`;
    return time;
  }

  async update_property(oldValue, newValue, row, column){
    console.log("row: " + row['value'])
    console.log("pro: " + row['property'])

    let dict = {};
    dict[row['property']] = row['value']
    
    try {
      update(ref(db, 'user_settings/' + this.state.user.uid), dict);
    } catch (error) {
      this.setState({ updateError: error.message });
    }
  }

  async del_db_owned_car_entry(id){
    try {
      await remove(ref(db, 'user_settings/' + this.state.user.uid + "/ownedCars/" + id));
    } catch (error) {
      this.setState({ updateError: error.message });
    }
  }

  async delete_owned_car(row, isSelect){
    if(isSelect === true){
      confirmAlert({
      title: 'Confirm to delete',
      message: 'Are you sure to delete this car from your owned cars?',
      buttons: [
        {
          label: 'Yes',
          onClick: () => {this.del_db_owned_car_entry(row['id'])}
        },
        {
          label: 'No'
        }
      ]
      });
    }
  }

  render() {
    const property_columns = [
        {
          dataField: 'id',
          text: 'Id',
          hidden: true
        },
        {
          dataField: 'property',
          text: 'Property',
          sort: true,
          editable: false
        },
        {
          dataField: 'value',
          text: 'Value',
          sort: true
        },
      ]; 
    const owned_cars_columns = [
        {
          dataField: 'id',
          text: 'Id',
          hidden: true
        },
        {
          dataField: 'car_id',
          text: 'Owned Cars',
          sort: true,
          editable: false
        }
      ]; 
    const defaultSorted = [{
      dataField: 'property',
      order: 'asc'
    }];
    const selectRow = {
      mode: 'checkbox',
      clickToSelect: false,
      hideSelectAll: true,
      onSelect: (row, isSelect, rowIndex, e) => {
        this.delete_owned_car(row, isSelect);
      }
    };
    return (
      <div className="m-5">
        <Header />
        <Container>
          <Row>
            <div className="m-5">
              <h2>Profile</h2>
            </div>
          </Row>
          <Row>
            <BootstrapTable 
              keyField='id' 
              data={this.state.properties} 
              columns={property_columns} 
              striped
              hover
              condensed
              bordered={ false }
              defaultSorted={ defaultSorted }
              noDataIndication="Table is Empty"
              //pagination={ paginationFactory() } 
              cellEdit={ cellEditFactory({
                mode: 'click',
                //onStartEdit: (row, column, rowIndex, columnIndex) => { console.log('onStartEdit Cell!!'); },
                //beforeSaveCell: (oldValue, newValue, row, column) => { console.log('Before Saving Cell!!'); },
                afterSaveCell: (oldValue, newValue, row, column) => { this.update_property(oldValue, newValue, row, column); }
              }) }
            />
          </Row>
          <Row>
            <div className="m-5">
              <h2>Owned Cars</h2>
            </div>
          </Row>
          <Row>
            <BootstrapTable 
              keyField='id' 
              data={this.state.owned_cars} 
              columns={owned_cars_columns} 
              striped
              hover
              condensed
              bordered={ false }
              defaultSorted={ defaultSorted }
              noDataIndication="Table is Empty"
              //pagination={ paginationFactory() } 
              cellEdit={ cellEditFactory({
                mode: 'click',
                //onStartEdit: (row, column, rowIndex, columnIndex) => { console.log('onStartEdit Cell!!'); },
                //beforeSaveCell: (oldValue, newValue, row, column) => { console.log('Before Saving Cell!!'); },
                afterSaveCell: (oldValue, newValue, row, column) => { this.update_property(oldValue, newValue, row, column); }
              }) }
              selectRow={ selectRow}
            />
          </Row>
          <Row>
            <Form onSubmit={this.handleSubmit}>
              <div className="px-3">
                <Row>
                  <Form.Group as={Col} controlId="car_id">
                    <Form.Label>Car ID</Form.Label>
                    <Form.Control onChange={this.handleChange_CarID} value={this.state.car_id}/>
                  </Form.Group>
                </Row>
              </div>
              <div className="px-3">
                <Button variant="primary"className="px-5" type="submit">
                  Add owned car
                </Button>
              </div>
            </Form>
          </Row>
          <Row>
            <div className="py-5 mx-3">
              Logged in as: <strong className="text-info">{this.state.user_settings.UserName}</strong>
            </div>
          </Row>
        </Container>       
      </div>
    );
  }
}
