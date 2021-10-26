import React, {Component} from "react";
import Header from "../components/Header";
import {auth, db} from "../services/firebase";
import Dropdown from 'react-bootstrap/Dropdown';
import {Col, Container, ListGroup, Row} from 'react-bootstrap';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import 'react-confirm-alert/src/react-confirm-alert.css'; // Import css
import {ToastContainer} from 'react-toastify';
import GaugeChart from 'react-gauge-chart'
import 'react-toastify/dist/ReactToastify.css';


export default class Overview extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: auth().currentUser,
            user_settings: {},
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
            writeError: null
        };

        this.car_selected = this.car_selected.bind(this);
    }

    async componentDidMount() {
        return new Promise((resolve, reject) => {
            return db.ref('user_settings/' + this.state.user.uid).on("value", snapshot => {

                let user_settings = {};

                snapshot.forEach((snap) => {
                    if (snap.key === "selectedCar") {
                        this.setState({selectedCar: snap.val()})
                    }
                    user_settings[snap.key] = snap.val()
                });

                this.setState({user_settings});
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
                    this.setState({owned_cars});
                })
            })
            .then(step3 => {
                db.ref("cars").on("value", snapshot => {
                    let cars = [];
                    snapshot.forEach((snap) => {
                        cars.push(snap.val());
                        cars[cars.length - 1].car_id = snap.key;
                    });

                    let filtered_cars = this.filter_to_only_owned_cars(cars);
                    this.setState({filtered_cars});

                    cars.sort(function (a, b) {
                        return a.timestamp - b.timestamp
                    })
                    this.setState({cars}, () => {
                        if (this.state.selectedCar !== undefined) {
                            let tmp = this.get_fills_of_a_car(this.state.selectedCar);
                            if (tmp !== undefined) {
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

    filter_to_only_owned_cars(cars) {
        let filtered_cars = [];

        cars.forEach(car => {
            if (this.state.owned_cars.includes(car['car_id']) === true) {
                filtered_cars.push(car)
            }
        });

        return filtered_cars;
    }

    calculate_stats(fills) {
        let nbr_of_fills = 0;
        let amount_spent = 0;
        let total_volume = 0;
        let min_odometer = NaN;
        let max_odometer = NaN;

        Object.keys(fills).forEach(function (fill) {
            nbr_of_fills = nbr_of_fills + 1;
            amount_spent = amount_spent + parseInt(fills[fill].price, 10);
            total_volume = total_volume + parseInt(fills[fill].fuelamount, 10);

            if ((isNaN(min_odometer)) || (min_odometer > parseInt(fills[fill].odometer, 10))) {
                min_odometer = parseInt(fills[fill].odometer, 10);
            }

            if ((isNaN(max_odometer)) || (max_odometer < parseInt(fills[fill].odometer, 10))) {
                max_odometer = parseInt(fills[fill].odometer, 10);
            }
        });

        let stats = this.state.stats;
        stats.nbr_of_fills = nbr_of_fills;
        stats.total_amount_spent = amount_spent;
        stats.total_volume_used = total_volume;
        stats.total_distance = max_odometer - min_odometer;
        this.setState({stats});

        this.calculate_average_fill(fills);
        this.calculate_average_consumption(fills);
    }

    calculate_average_fill(fills){
        let total_volume = 0;
        let nbr_of_fills = 0;
        let average_fill = NaN;

        Object.keys(fills).forEach(function(fill) {
            total_volume = total_volume + parseInt(fills[fill].fuelamount, 10);
            nbr_of_fills = nbr_of_fills + 1;
        });

        if(nbr_of_fills > 0){
            average_fill = total_volume / nbr_of_fills;

            let stats = this.state.stats;
            stats.average_fill = average_fill.toFixed(1);
            this.setState({stats});
        }
    }

    calculate_average_consumption(fills){
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
        }
        let stats = this.state.stats;
        stats.average_consumption = average_consumption.toFixed(1);
        this.setState({stats});
    }

    get_car_by_id(car_id) {
        let retval = undefined;
        this.state.cars.forEach(car => {
            if (car.car_id === car_id) {
                retval = car;
            }
        })
        return retval;
    }

    formatCar(car_id) {
        let name = ""

        if (car_id !== '') {
            let car = this.get_car_by_id(car_id);
            if (car !== undefined) {
                name = this.get_car_by_id(car_id).name;
            }
        }
        return name;
    }

    carFormatter(cell, row, rowIndex, formatExtraData) {
        let name = ""

        if (cell !== '') {
            formatExtraData.forEach(car => {
                if (car.car_id === cell) {
                    name = car.name;
                }
            })
        }
        return name;
    }

    async car_selected(id) {
        this.setState({selectedCar: id});
        this.setState({writeError: null});

        try {
            await db.ref('user_settings/' + this.state.user.uid).update({
                selectedCar: id,
            });
        } catch (error) {
            this.setState({writeError: error.message});
        }

        let tmp = this.get_fills_of_a_car(id);
        if (tmp !== undefined) {
            this.calculate_stats(tmp)
        }
        this.setState({
            fuelamount: '',
            odometer: '',
            price: ''
        });
    }

    get_fills_of_a_car(car_id) {
        let fills = [];
        if ((car_id !== undefined) && (car_id !== "")) {
            fills = this.get_car_by_id(this.state.selectedCar).fills;
        }

        //add property id to each fill
        try {
            Object.keys(fills).forEach(function (fill) {
                fills[fill]['id'] = fill;
            });
        } catch (error) {
            console.log('can not read any fills')
        }

        return fills;
    }
    render() {
        return (
            <div className="m-5">
                <Header/>
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

                                <Dropdown.Menu
                                    onClick={e => this.car_selected(e.target.id)}
                                >
                                    {this.state.filtered_cars.map(car => {
                                        return <Dropdown.Item id={car.car_id}
                                                              key={car.car_id}>{car.name}</Dropdown.Item>
                                    })}
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </Row>
                    <Row>
                        <Col>
                            <GaugeChart id="gauge-chart3"
                                        nrOfLevels={10}
                                        colors={["#FF5F6D", "#FFC371"]}
                                        arcWidth={0.3}
                                        percent={this.state.average_consumption}
                                        textColor={"#000000"}
                                        formatTextValue={value => value+' l/100km'}
                            />
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
                        <div className="py-5 mx-3">
                            Logged in as: <strong className="text-info">{this.state.user_settings.UserName}</strong>
                        </div>
                    </Row>
                </Container>
            </div>
        );
    }
}
