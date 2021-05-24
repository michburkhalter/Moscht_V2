import React, { Component } from "react";
import Header from "../components/Header";
import { auth } from "../services/firebase";
import { db } from "../services/firebase";
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form'
import { Container, Row, Col } from 'react-bootstrap';
import Button from 'react-bootstrap/Button'
import ZingChart from 'zingchart-react';
import {ListGroup} from 'react-bootstrap'
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';
import cellEditFactory from 'react-bootstrap-table2-editor';
import { confirmAlert } from 'react-confirm-alert'; // Import
import 'react-confirm-alert/src/react-confirm-alert.css'; // Import css
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import { show_toast_failure, show_toast_success } from "../helpers/toast";
import {time_formatter, fuel_efficiency_formatter, fuel_amount_formatter, odometer_formatter, price_formatter} from "../helpers/datatable_formatters";

export default class Overview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: auth().currentUser,
      datatable_rows: [],
      user_settings:{},
      cars: [],
      filtered_cars: [],
      owned_cars: [],
      fuelamount: '',
      odometer: '',
      price: '',
      selectedCar: '',
      stats: {
        nbr_of_fills: '',
        total_amount_spent: '',
        total_volume_used: '',
        total_distance: '',
        average_fill: '',
        average_consumption: '',
      },
      readError: null,
      writeError: null,
      gauge_consumption: {
        type: 'gauge',
        'scale-r': {
          aperture: 200,     //Specify your scale range.
          values: "0:10:1" //Provide min/max/step scale values.
        },
        series: [{
          values: []
        }],
        height: 300,
        width: 300,
      },
      gauge_volume: {
        type: 'gauge',
        'scale-r': {
          aperture: 200,     //Specify your scale range.
          values: "0:70:5" //Provide min/max/step scale values.
        },
        series: [{
          values: []
        }],
        height: 300,
        width: 300,
      },
      width: 0, 
      height: 0,
      window_width_where_table_content_is_hidden: 1000,
    };
    this.volume_gauge_ref = React.createRef();
    this.average_gauge_ref = React.createRef();
      
    this.handleChange_Fuelamount = this.handleChange_Fuelamount.bind(this);
    this.handleChange_Kilometer = this.handleChange_Kilometer.bind(this);
    this.handleChange_Price = this.handleChange_Price.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.car_selected = this.car_selected.bind(this);
    
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this); 

  }

  async componentDidMount() {
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);

    return new Promise((resolve, reject) => {
      return db.ref('user_settings/' + this.state.user.uid).on("value", snapshot => {
        
        let user_settings = {};

        snapshot.forEach((snap) => {
          if(snap.key === "selectedCar"){
            this.setState({selectedCar: snap.val()})
          }
          user_settings[snap.key] = snap.val()
        });

        this.setState({ user_settings });
                resolve();
      });
    })
        .then(step2 => {
      db.ref('user_settings/' + this.state.user.uid + '/ownedCars').on("value", snapshot => {
        let owned_cars = [];
        //console.log("owned")
        snapshot.forEach((snap) => {
          owned_cars.push(snap.val()['id']);
        });
        this.setState({ owned_cars });
      })      
    })
    .then(step3 => {
      db.ref("cars").on("value", snapshot => {
        let cars = [];
        snapshot.forEach((snap) => {
          cars.push(snap.val());
          cars[cars.length-1].car_id = snap.key;
        });

        let filtered_cars = this.filter_to_only_owned_cars(cars);
        this.setState({filtered_cars});

        cars.sort(function (a, b) { return a.timestamp - b.timestamp })
        this.setState({ cars },() => {
          if (this.state.selectedCar !== undefined){
            let tmp = this.get_fills_of_a_car(this.state.selectedCar);
            if (tmp !== undefined){
              let tmp2 = Object.values(tmp);
              this.setState({datatable_rows: tmp2})
              this.feed_consumption_gauge(tmp)
              this.feed_volume_gauge(tmp)
              this.calculate_stats(tmp)
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

  filter_to_only_owned_cars(cars){
    let filtered_cars = [];

    cars.forEach(car => {
      if (this.state.owned_cars.includes(car['car_id']) === true){
        filtered_cars.push(car)
      }
    });

    return filtered_cars;
  }

  calculate_stats(fills){
    let nbr_of_fills = 0;
    let amount_spent = 0;
    let total_volume = 0;
    let min_odometer = NaN;
    let max_odometer = NaN;

    Object.keys(fills).forEach(function(fill) {
      nbr_of_fills = nbr_of_fills + 1;
      amount_spent = amount_spent + parseInt(fills[fill].price, 10);
      total_volume = total_volume + parseInt(fills[fill].fuelamount, 10);

      if((isNaN(min_odometer)) || (min_odometer > parseInt(fills[fill].odometer, 10))){
        min_odometer = parseInt(fills[fill].odometer, 10);
      }

      if((isNaN(max_odometer)) || (max_odometer < parseInt(fills[fill].odometer, 10))){
        max_odometer = parseInt(fills[fill].odometer, 10);
      }      
    });

    let stats = this.state.stats;
    stats.nbr_of_fills = nbr_of_fills;
    stats.total_amount_spent = amount_spent;
    stats.total_volume_used = total_volume;
    stats.total_distance = max_odometer - min_odometer;
    this.setState({stats});
  }

  feed_volume_gauge(fills){
    let total_volume = 0;
    let nbr_of_fills = 0;
    let average_fill = NaN;

    Object.keys(fills).forEach(function(fill) {
      total_volume = total_volume + parseInt(fills[fill].fuelamount, 10);
      nbr_of_fills = nbr_of_fills + 1;
    });

    if(nbr_of_fills > 0){
      average_fill = total_volume / nbr_of_fills;  

      this.volume_gauge_ref.current.setseriesdata({
        plotindex: 0,
        data: {
          values: [average_fill]
        }
      });

      let stats = this.state.stats;
      stats.average_fill = average_fill.toFixed(1);
      this.setState({stats});
    }
    //console.log(average_fill)
  }

  feed_consumption_gauge(fills){
    let nbr_of_fills = 0;
    let cur_odometer = 0;
    let prev_odometer = 0;

    let distance = 0;
    let volume = 0;
    let average_consumption = 0;

    Object.keys(fills).forEach(function(fill) {
      cur_odometer = parseInt(fills[fill].odometer, 10);

      if(nbr_of_fills > 0){
        distance = distance + (cur_odometer - prev_odometer);
        volume = volume + parseInt(fills[fill].fuelamount, 10);
      }

      nbr_of_fills = nbr_of_fills + 1;
      prev_odometer = cur_odometer;
    });


    if (nbr_of_fills > 1){
      average_consumption = volume / distance;
      average_consumption = average_consumption * 100;

      this.average_gauge_ref.current.setseriesdata({
        plotindex: 0,
        data: {
          values: [average_consumption]
        }
      });

    }else{
      this.average_gauge_ref.current.setseriesdata({
        plotindex: 0,
        data: {
          values: []
        }
      });
    }   
    let stats = this.state.stats;
    stats.average_consumption = average_consumption.toFixed(1);
    this.setState({stats});
  }

  handleChange_Fuelamount(event) {
    this.setState({
      fuelamount: event.target.value
    });
  }

  handleChange_Kilometer(event){
    this.setState({
      odometer: event.target.value
    });
  }

  handleChange_Price(event){
    this.setState({
      price: event.target.value
    });
  }

  order_fills_by_odometer(a, b) {
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

  calculate_fuel_consumption_of_leg(fuelamount, odometer, ref_odometer){
    let average_consumption = 0;

    average_consumption = fuelamount / (odometer-ref_odometer);
    average_consumption = Number((average_consumption * 100).toFixed(1));

    return average_consumption;
  }

  async handleSubmit(event) {
    event.preventDefault();
    this.setState({ writeError: null });

    let ordered_fills = this.state.datatable_rows.sort(this.order_fills_by_odometer);
    let average_consumption_of_leg = 0;
    try{
      average_consumption_of_leg = this.calculate_fuel_consumption_of_leg(this.state.fuelamount, this.state.odometer, ordered_fills[ordered_fills.length-1].odometer);
    }catch (error) {
      average_consumption_of_leg = 0;
    }

    if ((this.state.fuelamount === "") || (this.state.odometer === "") || (this.state.price === ""))
    {
      show_toast_failure("Angaben inkomplett")
      return;
    }

    try {
      if(this.state.selectedCar !== ''){
        await db.ref('cars/' + this.state.selectedCar + "/fills").push({
          fuelamount: this.state.fuelamount,
          odometer: this.state.odometer,
          price: this.state.price,
          timestamp: Date.now(),
          user: this.state.user_settings.UserName,
          fuel_efficiency: average_consumption_of_leg,
        });
        this.setState({ fuelamount: '',
                        odometer: '',
                        price: '' });

        show_toast_success('Tiptop, ⌀ '+ average_consumption_of_leg +' l/km');
      }else{
        this.setState({ writeError: "please select a car first."});
        show_toast_failure("No Car selected")
      }
    } catch (error) {
      this.setState({ writeError: error.message });
    }

    
  }

  get_car_by_id(car_id){
    let retval = undefined;
    this.state.cars.forEach(car => {
      if(car.car_id === car_id){
        retval = car;
      }
    })
    return retval;
  }
  formatCar(car_id){
    let name = ""

    if(car_id !== ''){
      let car = this.get_car_by_id(car_id);
      if(car !== undefined){
        name =  this.get_car_by_id(car_id).name;
      }
    }
    return name;
  }
  carFormatter(cell, row, rowIndex, formatExtraData){
    let name = ""

    if(cell !== ''){
      formatExtraData.forEach(car => {
        if(car.car_id === cell){
          name = car.name;
        }
      })
    }
    return name;
  }

  async car_selected(id){
    this.setState({ selectedCar: id });
    this.setState({ writeError: null });

    try {
        await db.ref('user_settings/' + this.state.user.uid).update({
          selectedCar: id,
        });
    } catch (error) {
      this.setState({ writeError: error.message });
    }

    try{
      this.setState({datatable_rows: Object.values(this.get_fills_of_a_car(id))});
    }catch (error)
    {
      console.log("no fills available")
      this.setState({datatable_rows: []});
    }
    

    let tmp = this.get_fills_of_a_car(id);
    if (tmp !== undefined){
      this.feed_consumption_gauge(tmp)
      this.feed_volume_gauge(tmp)
      this.calculate_stats(tmp)
    }
    this.setState({ fuelamount: '',
                        odometer: '',
                        price: '' });
  }

  get_fills_of_a_car(car_id){
    let fills = [];
    if((car_id !== undefined) && (car_id !== "")){
      fills = this.get_car_by_id(this.state.selectedCar).fills;
    }

    //add property id to each fill
    try{
      Object.keys(fills).forEach(function(fill) {
        fills[fill]['id'] = fill;
      });
    } catch (error) {
      console.log('can not read any fills')
    }
    
    return fills;
  }

  async update_fill(oldValue, newValue, row, column){
    try {
      if(! row.hasOwnProperty('fuel_efficiency')){
        row.fuel_efficiency = "-"
      }

      await db.ref('cars/' + this.state.selectedCar + "/fills/" + row['id']).update({
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

  async del_db_fill_entry(id){
    try {
      await db.ref('cars/' + this.state.selectedCar + "/fills/" + id).remove();
    } catch (error) {
      this.setState({ updateError: error.message });
    }
  }

  async delete_fill(row, isSelect){
    if(isSelect === true){
      confirmAlert({
      title: 'Confirm to delete',
      message: 'Are you sure to delete this fill from the db?',
      buttons: [
        {
          label: 'Yes',
          onClick: () => {this.del_db_fill_entry(row['id'])}
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
          dataField: 'fuelamount',
          text: 'Benzin',
          sort: true,
          formatter: fuel_amount_formatter,
        },
        {
          dataField: 'odometer',
          text: 'Kilometer',
          sort: true,
          formatter: odometer_formatter,
        },
        {
          dataField: 'price',
          text: 'Preis',
          sort: true,
          formatter: price_formatter,
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
          formatter: fuel_efficiency_formatter,
        }
      ]; 

    if (this.state.width < this.state.window_width_where_table_content_is_hidden) {
      fill_columns[4].hidden = true // timestamp
      fill_columns[5].hidden = true // Wer
      fill_columns[6].hidden = true // Verbrauch
    }

    const defaultSorted = [{
      dataField: 'timestamp',
      order: 'desc'
    }];
    const selectRow = {
      mode: 'checkbox',
      clickToSelect: false,
      hideSelectAll: true,
      onSelect: (row, isSelect, rowIndex, e) => {
        this.delete_fill(row, isSelect);
      }
    };
    return(
      <div className="m-5" >
        <Header />
        <Container >
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

                <Dropdown.Menu
                  onClick={e => this.car_selected(e.target.id)}
                >
                  {this.state.filtered_cars.map(car => {
                    return <Dropdown.Item id={car.car_id} key={car.car_id}>{car.name}</Dropdown.Item>
                  })}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Row>
          <Row className="py-1">
            {/* Fuel filling form */}
            <Form onSubmit={this.handleSubmit}>
              <Form.Row>
                <Form.Group as={Col} controlId="odometer_id">
                  <Form.Label>Kilometerstand</Form.Label>
                  <Form.Control type="number" onChange={this.handleChange_Kilometer} value={this.state.odometer}/>
                </Form.Group>
                
                <Form.Group as={Col} controlId="fuelamount_id">
                  <Form.Label>Benzinmenge</Form.Label>
                  <Form.Control type="number" onChange={this.handleChange_Fuelamount} value={this.state.fuelamount}/>
                </Form.Group>

                <Form.Group as={Col} controlId="price_id">
                  <Form.Label>Preis</Form.Label>
                  <Form.Control type="number" onChange={this.handleChange_Price} value={this.state.price}/>
                </Form.Group>
              </Form.Row>
              <Button variant="primary"className="px-5" type="submit">
                Submit
              </Button>
            </Form>
          </Row>
          <Row>
              <Col >
                <h2>&empty; Verbrauch</h2>
                <ZingChart ref={this.average_gauge_ref} data={this.state.gauge_consumption}/>
              </Col>
              <Col>
                <h2>&empty; Tankmenge</h2>
                <ZingChart ref={this.volume_gauge_ref}  data={this.state.gauge_volume}/>
              </Col>
              <Col>
                <h2>Stats</h2>
                <ListGroup>
                  <ListGroup.Item>&sum; Tankungen: <strong>{this.state.stats.nbr_of_fills}</strong></ListGroup.Item>
                  <ListGroup.Item>&sum; Moscht: <strong>{this.state.stats.total_volume_used} Liter</strong></ListGroup.Item>
                  <ListGroup.Item>&sum; Benzinkosten: <strong>CHF {this.state.stats.total_amount_spent}</strong></ListGroup.Item>
                  <ListGroup.Item>&sum; Strecke: <strong>{this.state.stats.total_distance} km</strong></ListGroup.Item>
                  <ListGroup.Item>&empty; Tankmenge: <strong>{this.state.stats.average_fill} l</strong></ListGroup.Item>
                  <ListGroup.Item>&empty; Verbrauch: <strong>{this.state.stats.average_consumption} l/100km</strong></ListGroup.Item>
                </ListGroup>
              </Col>
          </Row>
          <Row>
            <h2>Tankungen</h2>
            <BootstrapTable 
              keyField='id' 
              data={this.state.datatable_rows} 
              columns={fill_columns} 
              striped
              hover
              condensed
              bordered={ false }
              defaultSorted={ defaultSorted }
              noDataIndication="Table is Empty"
              pagination={ paginationFactory() } 
              cellEdit={ cellEditFactory({
                mode: 'click',
                onStartEdit: (row, column, rowIndex, columnIndex) => { console.log('onStartEdit Cell!!'); },
                beforeSaveCell: (oldValue, newValue, row, column) => { console.log('Before Saving Cell!!'); },
                afterSaveCell: (oldValue, newValue, row, column) => { this.update_fill(oldValue, newValue, row, column); }
              }) }
              selectRow={ selectRow }
            />
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
