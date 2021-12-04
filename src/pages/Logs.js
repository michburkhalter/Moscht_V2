import React, {Component} from "react";
import Header from "../components/Header";
import {auth, db, storageRef} from "../services/firebase";
import {onValue, push, ref, remove, update} from "firebase/database";
import {deleteObject, getDownloadURL, ref as storageRefFnc, uploadBytes} from "firebase/storage";
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form'
import {Col, Container, Row} from 'react-bootstrap';
import Button from 'react-bootstrap/Button'
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';
import cellEditFactory, {Type} from 'react-bootstrap-table2-editor';
import {confirmAlert} from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import {odometer_formatter, price_formatter, time_formatter} from '../helpers/datatable_formatters';
import {show_toast_failure} from "../helpers/toast";
import {ToastContainer} from "react-toastify";

export default class Logs extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: auth.currentUser,
            datatable_rows: [],
            user_settings: {},
            cars: [],
            filtered_cars: [],
            owned_cars: [],
            log_what: '',
            log_odometer: '',
            log_who: '',
            log_price: '',
            log_file: undefined,
            selectedCar: '',
            readError: null,
            writeError: null,
        };

        this.handleChange_LogWhat = this.handleChange_LogWhat.bind(this);
        this.handleChange_LogWho = this.handleChange_LogWho.bind(this);
        this.handleChange_LogOdometer = this.handleChange_LogOdometer.bind(this);
        this.handleChange_LogPrice = this.handleChange_LogPrice.bind(this);
        this.handleChange_LogFile = this.handleChange_LogFile.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
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
                    this.setState({
                        "filtered_cars": filtered_cars,
                        "cars": cars
                    }, () => {
                        if (this.state.selectedCar !== undefined) {
                            let tmp = this.get_logs_of_a_car(this.state.selectedCar);
                            if (tmp !== undefined) {
                                let tmp2 = Object.values(tmp);
                                this.setState({datatable_rows: tmp2})
                            } else {
                                this.setState({datatable_rows: []})
                            }
                        }
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

    handleChange_LogWhat(event) {
        this.setState({
            log_what: event.target.value
        });
    }

    handleChange_LogWho(event) {
        this.setState({
            log_who: event.target.value
        });
    }

    handleChange_LogOdometer(event) {
        this.setState({
            log_odometer: event.target.value
        });
    }

    handleChange_LogPrice(event) {
        this.setState({
            log_price: event.target.value
        });
    }

    handleChange_LogFile(e) {
        const image = e.target.files[0]
        console.log("image added to state");

        this.setState({
            log_file: image
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.setState({writeError: null});
        let timestamp = Date.now();
        let file_name = '';
        let file_url = '';

        if ((this.state.selectedCar === '') || (this.state.selectedCar === undefined)) {
            console.log("oh oh, please select a car in order to upload any data");
            this.setState({writeError: "please select a car first."});
            return;
        }

        if((this.state.log_what === '') || (this.state.log_odometer === '')){
            show_toast_failure("bitte mindestens \"Was\" und \"Kilometerstand\" ausfüllen!");
            return;
        }

        if (this.state.log_file !== undefined) {
            file_name = timestamp + '_' + this.state.log_file.name;
        } else {
            file_name = '-'
        }

        //upload file to storage
        try {
            if (this.state.log_file !== undefined) {
                console.log('Upload file!')

                const file_ref = storageRefFnc(storageRef, 'documents/' + this.state.selectedCar + '/' + file_name);
                console.log("post");

                // put file to storage
                await uploadBytes(file_ref, this.state.log_file).then((snapshot) => {
                    console.log('Uploaded a blob or file!');
                });

                //get download url to document
                //await ref.getDownloadURL().then(function (url) {
                await getDownloadURL(storageRefFnc(file_ref))
                    .then((url) => {
                        file_url = url;
                    }).catch(function (error) {
                        console.log("error on getDownloadURL")
                        console.log(error);
                    });

                this.setState({log_file: undefined});
            }

            //save log to database
            //await db.ref('cars/' + this.state.selectedCar + "/logs").push({
            await push(ref(db, 'cars/' + this.state.selectedCar + "/logs"), {
                what: this.state.log_what,
                odometer: this.state.log_odometer,
                price: this.state.log_price,
                who: this.state.log_who,
                timestamp: timestamp,
                user: this.state.user.email,
                file: file_name,
                file_url: file_url,
            });
            this.setState({
                log_what: '',
                log_odometer: '',
                log_price: '',
                log_who: ''
            });
        } catch (error) {
            console.log("oh oh");
            console.log(error);
            this.setState({writeError: error.message});
        }
    }

    formatTime(timestamp) {
        const d = new Date(timestamp);
        const time = `${d.getDate()}/${(d.getMonth() + 1)}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}`;
        return time;
    }


    fileFormatter(cell, row, rowIndex, formatExtraData) {
        if ((cell === undefined) || (cell === '-') || (cell === '')) {
            return "-"
        }

        var myRe = /\d*_(.*\..*)/;
        var myArray = myRe.exec(cell);

        var file_url = row.file_url;

        return (
            <span>
          <a href={file_url} target="_blank" rel="noreferrer noopener">{myArray[1]}</a>
        </span>
        );
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
            this.setState({datatable_rows: Object.values(this.get_logs_of_a_car(id))});
        } catch (error) {
            console.log("no logs available");
            this.setState({datatable_rows: []});
        }

        this.setState({
            log_what: '',
            log_odometer: '',
            log_price: '',
            log_who: '',
            log_file: undefined
        });
    }

    get_logs_of_a_car(car_id) {
        let logs = [];
        if ((car_id !== undefined) && (car_id !== "")) {
            logs = this.get_car_by_id(this.state.selectedCar).logs;
        }

        //add property id to each log
        try {
            Object.keys(logs).forEach(function (log) {
                logs[log]['id'] = log;
            });
        } catch (error) {
            console.log('can not read any logs')
        }

        return logs;
    }

    async update_log(oldValue, newValue, row, column) {
        try {
            await update(ref(db, 'cars/' + this.state.selectedCar + "/logs/" + row['id']), {
                price: row['price'],
                odometer: row['odometer'],
                what: row['what'],
                timestamp: parseInt(row['timestamp']),
                user: row['user'],
                who: row['who']
            });
        } catch (error) {
            this.setState({updateError: error.message});
        }
    }

    async del_db_log_entry(id) {
        try {
            await remove(ref(db, 'cars/' + this.state.selectedCar + "/logs/" + id));
        } catch (error) {
            console.log(error);
            this.setState({updateError: error.message});
        }
    }

    async del_file_log_entry(file) {
        if ((file !== undefined) && (file !== '-') && (file !== '')) {
            // Create a reference to the file to delete
            let file_ref = storageRefFnc(storageRef, 'documents/' + this.state.selectedCar + '/' + file);

            // Delete the file
            deleteObject(file_ref).then(function () {
                // File deleted successfully
                console.log("delete file successfully")
            }).catch(function (error) {
                // Uh-oh, an error occurred!
                console.log("delete file fail")
            });
        }
    }

    async delete_log(row, isSelect) {
        if (isSelect === true) {
            confirmAlert({
                title: 'Confirm to delete',
                message: 'Are you sure to delete this log from the db?',
                buttons: [
                    {
                        label: 'Yes',
                        onClick: () => {
                            this.del_db_log_entry(row['id']);
                            this.del_file_log_entry(row['file'])
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
        const log_columns = [
            {
                dataField: 'id',
                text: 'Id',
                hidden: true
            },
            {
                dataField: 'what',
                text: 'Was',
                sort: true,
                editor: {
                    type: Type.TEXTAREA
                }
            },
            {
                dataField: 'odometer',
                text: 'Kilometerstand',
                sort: true,
                formatter: odometer_formatter,
            },
            {
                dataField: 'price',
                text: 'Preis',
                formatter: price_formatter,
                sort: true
            },
            {
                dataField: 'who',
                text: 'Ausgeführt durch',
                sort: true
            },
            {
                //todo: https://react-bootstrap-table.github.io/react-bootstrap-table2/storybook/index.html?selectedKind=Cell%20Editing&selectedStory=Date%20Editor&full=0&addons=1&stories=1&panelRight=0&addonPanel=storybook%2Factions%2Factions-panel
                dataField: 'timestamp',
                text: 'Datum',
                formatter: time_formatter,
                sort: true
            },
            {
                dataField: 'user',
                text: 'Erfasser',
                sort: true
            },
            {
                dataField: 'file',
                text: 'Beleg',
                formatter: this.fileFormatter,
                editable: false,
            },
            {
                dataField: 'file_url',
                text: 'File URL',
                editable: false,
                hidden: true,
            }
        ];
        const defaultSorted = [{
            dataField: 'odometer',
            order: 'desc'
        }];
        const selectRow = {
            mode: 'checkbox',
            clickToSelect: false,
            hideSelectAll: true,
            onSelect: (row, isSelect, rowIndex, e) => {
                this.delete_log(row, isSelect);
            }
        };
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
                        <div className="px-3 m-5">
                            <Dropdown>
                                <Dropdown.Toggle variant="primary" id="dropdown-carselection">
                                    {this.formatCar(this.state.selectedCar)}
                                </Dropdown.Toggle>

                                <Dropdown.Menu
                                    onClick={e => this.car_selected(e.target.id)}
                                >
                                    {
                                        this.state.filtered_cars.map(car => {
                                            return <Dropdown.Item id={car.car_id}
                                                                  key={car.car_id}>{car.name}</Dropdown.Item>
                                        })
                                    }
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </Row>
                    <Row>
                        <h2>Log Einträge</h2>
                        <BootstrapTable
                            keyField='id'
                            data={this.state.datatable_rows}
                            columns={log_columns}
                            striped
                            hover
                            condensed
                            bordered={false}
                            defaultSorted={defaultSorted}
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
                                    this.update_log(oldValue, newValue, row, column);
                                }
                            })}
                            selectRow={selectRow}
                        />
                    </Row>
                    <Row>
                        {/* Fuel filling form */}
                        <Form onSubmit={this.handleSubmit}>
                            <div className="px-3">
                                <Row>
                                    <Form.Group as={Col} controlId="log_what_id">
                                        <Form.Label>Was</Form.Label>
                                        <Form.Control as="textarea" rows="3" onChange={this.handleChange_LogWhat}
                                                      value={this.state.log_what}/>
                                    </Form.Group>

                                    <Form.Group as={Col} controlId="log_odometer_id">
                                        <Form.Label>Kilometerstand</Form.Label>
                                        <Form.Control type="number" onChange={this.handleChange_LogOdometer}
                                                      value={this.state.log_odometer}/>
                                    </Form.Group>

                                    <Form.Group as={Col} controlId="log_who_id">
                                        <Form.Label>Ausgeführt durch</Form.Label>
                                        <Form.Control onChange={this.handleChange_LogWho} value={this.state.log_who}/>
                                    </Form.Group>

                                    <Form.Group as={Col} controlId="log_price_id">
                                        <Form.Label>Preis</Form.Label>
                                        <Form.Control type="number" onChange={this.handleChange_LogPrice}
                                                      value={this.state.log_price}/>
                                    </Form.Group>

                                    <Form.Group as={Col} controlId="log_doc_id">
                                        <Form.Label>Attachment</Form.Label>
                                        <Form.Control type="file" onChange={this.handleChange_LogFile}/>
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
                            Logged in as: <strong className="text-info">{this.state.user_settings.UserName}</strong>
                        </div>
                    </Row>
                </Container>
            </div>
        );
    }
}
