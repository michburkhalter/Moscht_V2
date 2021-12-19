import React, {Component} from "react";
import Header from "../components/Header";
import {auth, db} from "../services/firebase";
import {onValue, ref, update} from "firebase/database";
import Dropdown from 'react-bootstrap/Dropdown';
import {Col, Container, ListGroup, Row} from 'react-bootstrap';
import 'zingchart/es6';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import 'react-confirm-alert/src/react-confirm-alert.css'; // Import css
import {ToastContainer} from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import ZingChart from "zingchart-react";
import {odometer_formatter} from "../helpers/datatable_formatters";

export default class Overview extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: auth.currentUser,
            datatable_rows: [],
            user_settings: {},
            cars: [],
            filtered_cars: [],
            owned_cars: [],
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
                backgroundColor:'none',
                plotarea:{
                    backgroundColor:'transparent'
                },
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
                backgroundColor:'none',
                plotarea:{
                    backgroundColor:'transparent'
                },
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

        };
        this.volume_gauge_ref = React.createRef();
        this.average_gauge_ref = React.createRef();

        this.car_selected = this.car_selected.bind(this);

    }

    async componentDidMount() {
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
                        cars[cars.length - 1].car_id = snap.key;
                    });

                    let filtered_cars = this.filter_to_only_owned_cars(cars);
                    this.setState({"filtered_cars": filtered_cars}, () => {
                        cars.sort(function (a, b) {
                            return a.timestamp - b.timestamp
                        })
                        this.setState({cars}, () => {
                            if (this.state.selectedCar !== undefined) {
                                let tmp = this.get_fills_of_a_car(this.state.selectedCar);
                                if (tmp !== undefined) {
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
            });
        });
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
    }

    feed_volume_gauge(fills) {
        let total_volume = 0;
        let nbr_of_fills = 0;
        let average_fill = NaN;

        Object.keys(fills).forEach(function (fill) {
            total_volume = total_volume + parseInt(fills[fill].fuelamount, 10);
            nbr_of_fills = nbr_of_fills + 1;
        });

        if (nbr_of_fills > 0) {
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

    feed_consumption_gauge(fills) {
        let nbr_of_fills = 0;
        let cur_odometer = 0;
        let prev_odometer = 0;

        let distance = 0;
        let volume = 0;
        let average_consumption = 0;

        Object.keys(fills).forEach(function (fill) {
            cur_odometer = parseInt(fills[fill].odometer, 10);

            if (nbr_of_fills > 0) {
                distance = distance + (cur_odometer - prev_odometer);
                volume = volume + parseInt(fills[fill].fuelamount, 10);
            }

            nbr_of_fills = nbr_of_fills + 1;
            prev_odometer = cur_odometer;
        });


        if (nbr_of_fills > 1) {
            average_consumption = volume / distance;
            average_consumption = average_consumption * 100;

            this.average_gauge_ref.current.setseriesdata({
                plotindex: 0,
                data: {
                    values: [average_consumption]
                }
            });
        } else {
            average_consumption = 0;
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

        await update(ref(db, 'user_settings/' + this.state.user.uid), {
            selectedCar: id
        });

        try {
            this.setState({datatable_rows: Object.values(this.get_fills_of_a_car(id))});
        } catch (error) {
            console.log("no fills available")
            this.setState({datatable_rows: []});
        }


        let tmp = this.get_fills_of_a_car(id);
        if (tmp !== undefined) {
            this.feed_consumption_gauge(tmp)
            this.feed_volume_gauge(tmp)
            this.calculate_stats(tmp)
        }
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
                            <h2>&empty; Verbrauch</h2>
                            <ZingChart ref={this.average_gauge_ref} data={this.state.gauge_consumption}/>
                        </Col>
                        <Col>
                            <h2>&empty; Tankmenge</h2>
                            <ZingChart ref={this.volume_gauge_ref} data={this.state.gauge_volume}/>
                        </Col>
                        <Col>
                            <h2>Stats</h2>
                            <ListGroup>
                                <ListGroup.Item>&sum; Tankungen: <strong>{this.state.stats.nbr_of_fills}</strong></ListGroup.Item>
                                <ListGroup.Item>&sum; Moscht: <strong>{this.state.stats.total_volume_used} Liter</strong></ListGroup.Item>
                                <ListGroup.Item>&sum; Benzinkosten: <strong>CHF {this.state.stats.total_amount_spent}</strong></ListGroup.Item>
                                <ListGroup.Item>&sum; Strecke: <strong>{odometer_formatter(this.state.stats.total_distance)}</strong></ListGroup.Item>
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