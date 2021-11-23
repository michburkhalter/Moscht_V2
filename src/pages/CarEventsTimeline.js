import React, {Component} from 'react';
import Header from '../components/Header';
import {auth, db} from '../services/firebase';
import {onValue, ref, update} from "firebase/database";

import Dropdown from 'react-bootstrap/Dropdown';
import {Container, Row} from 'react-bootstrap';
import {FaGasPump, FaTools} from 'react-icons/fa';

import {VerticalTimeline, VerticalTimelineElement} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';

import {
    fuel_amount_formatter,
    fuel_efficiency_formatter,
    odometer_formatter,
    price_formatter,
    time_formatter
} from '../helpers/datatable_formatters';

export default class CarEventsTimeline extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: auth.currentUser,
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

        const user_settings = ref(db, 'user_settings/' + this.state.user.uid);
        onValue(user_settings, snapshot => {
            console.log("onValue: user_settings");
            let user_settings = {};

            snapshot.forEach(snap => {
                if (snap.key === 'selectedCar') {
                    this.setState({selectedCar: snap.val()});
                    this.update_timeline_events(snap.val());
                }
                user_settings[snap.key] = snap.val();
            });

            this.setState({user_settings});
        });

        const owned_cars = ref(db, 'user_settings/' + this.state.user.uid + '/ownedCars');
        onValue(owned_cars, snapshot => {
            console.log("onValue: owned_cars");
            let owned_cars = [];
            //console.log("owned")
            snapshot.forEach(snap => {
                owned_cars.push(snap.val()['id']);
            });
            this.setState({owned_cars});
        });

        const cars = ref(db, 'cars');
        onValue(cars, snapshot => {
            console.log("onValue: cars");
            let cars = [];
            snapshot.forEach(snap => {
                cars.push(snap.val());
                cars[cars.length - 1].car_id = snap.key;
            });

            let filtered_cars = this.filter_to_only_owned_cars(cars);
            this.setState({filtered_cars});

            this.setState({
                events: []
            });
            let db_events = [];
            this.setState({cars}, () => {
                if (this.state.selectedCar !== undefined) {
                    let fills = this.get_fills_of_a_car(this.state.selectedCar);
                    let logs = this.get_logs_of_a_car(this.state.selectedCar);
                    if (fills !== undefined) {
                        Object.values(fills).forEach(fill =>
                            db_events.push({fill: fill, odometer: fill.odometer})
                        );
                    }
                    if (logs !== undefined) {
                        Object.values(logs).forEach(log =>
                            db_events.push({log: log, odometer: log.odometer})
                        );
                    }

                    let tmp2 = Object.values(db_events).sort(
                        this.compare_events_by_odometer_desc
                    );

                    this.setState({db_events: tmp2});
                }
            });
        });
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateWindowDimensions);
    }

    updateWindowDimensions() {
        this.setState({width: window.innerWidth, height: window.innerHeight});
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
        this.setState({selectedCar: id});
        this.setState({writeError: null});


        await update(ref(db, 'user_settings/' + this.state.user.uid), {
            selectedCar: id
        });

        this.update_timeline_events(id);
    }

    update_timeline_events(id) {
        let db_events = [];

        try {
            let fills = this.get_fills_of_a_car(id);
            let logs = this.get_logs_of_a_car(id);
            if (fills !== undefined) {
                Object.values(fills).forEach(fill =>
                    db_events.push({fill: fill, odometer: fill.odometer})
                );
            }
            if (logs !== undefined) {
                Object.values(logs).forEach(log =>
                    db_events.push({log: log, odometer: log.odometer})
                );
            }

            let tmp2 = Object.values(db_events).sort(
                this.compare_events_by_odometer_desc
            );

            this.setState({db_events: tmp2});
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
            Object.keys(fills).forEach(function (fill) {
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
            Object.keys(logs).forEach(function (log) {
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
                iconStyle={{background: 'rgb(33, 150, 243)', color: '#fff'}}
                icon={<FaGasPump/>}
            >
                <h3 className="vertical-timeline-element-title">Tankung</h3>
                <div>Kilometerstand: {odometer_formatter(odometer)}</div>
                <div>Menge: {fuel_amount_formatter(fuelamount)}</div>
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
        who = '',
        file = '',
        file_url = ''
    ) {
        let the_file = '';
        if ((file != '') && (file != '-')) {
            the_file = <div>Attachement: <a href={file_url}>{file}</a></div>;
        }

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
                iconStyle={{background: 'rgb(242, 157, 24)', color: '#fff'}}
                icon={<FaTools/>}
            >
                <h3 className="vertical-timeline-element-title">{what}</h3>
                <div>Kilometerstand: {odometer_formatter(odometer)}</div>
                <div>Preis: {price_formatter(price)}</div>
                <div>Ausgeführt durch: {who}</div>
                <div>Erfasser: {user}</div>
                {the_file}
            </VerticalTimelineElement>
        );
        return event;
    }

    get_timeline_events() {
        let ev = [];
        let eventslength = this.state.db_events.length;
        let events = this.state.db_events;

        if (eventslength > 1) {
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
                    if ('file' in event.log) {
                        ev.push(
                            this.create_log_event(
                                event.log.what,
                                event.log.price,
                                event.log.odometer,
                                event.log.timestamp,
                                event.log.user,
                                event.log.who,
                                event.log.file,
                                event.log.file_url
                            )
                        );
                    } else {
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
                }
            });
        }
        return ev;
    }

    render() {
        return (
            <div className="m-5">
                <Header/>
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
