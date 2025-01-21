import { SetStateAction, useEffect, useRef, useState } from "react";
import { CBadge, CButton, CCol, CContainer, CMultiSelect, CRow, CSmartTable, CSpinner, CToaster } from "@coreui/react-pro";
import { Activity, DatabaseService, Client, formatCurrency } from "src/db/database";
import { CreateActivity } from "./CreateActivity";
import DeleteActivity from "./DeleteActivity";
import EditActivity from "./EditActivity";
import { cilArrowRight, cilReload } from "@coreui/icons";
import CIcon from "@coreui/icons-react";
import type { Option } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import Activities from './Activities';

interface TableProps {
    allActivities: Activity[];
    setAllActivities: (activities: Activity[]) => void;
    filteredActivities: Activity[];
    setFilteredActivities: (activities: Activity[]) => void;
    clients: Client[];
    setClients: (clients: Client[]) => void;
    selectedClient: string | number | undefined;
    setSelectedClient: (client: string | number | undefined) => void;
}

const ActivitiesTable: React.FC<TableProps> = ({allActivities, setAllActivities, filteredActivities, setFilteredActivities, clients, setClients, selectedClient, setSelectedClient}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [toast, addToast] = useState<any>(0)
    const toaster = useRef<HTMLDivElement | null>(null); 

    const [clientOptions, setClientOptions] = useState<Option[]>([]); 

    const [showDeleteActivityModal, setShowDeleteActivityModal] = useState(false);
    const [showEditActivityModal, setShowEditActivityModal] = useState(false);

    const [currentActivity, setCurrentActivity] = useState<Activity | undefined>(undefined);
    
    useEffect(() => {
        const fetchActivities = async () => {
            const db = new DatabaseService();
            const activities = await db.getActivities();
            const clients = await db.getClients();

            setClientOptions(
                clients!
                    .map(client => ({ value: client.cid, label: client.firstName + ' ' + client.lastName }))
                    .sort((a, b) => a.label.localeCompare(b.label))
            ); 
            setFilteredActivities(activities);
            setAllActivities(activities); // Store the original activities
            setClients(clients);

            setIsLoading(false);
        };
        fetchActivities();
    }, []);

    if (isLoading) {
        return( 
            <div className="text-center">
                <CSpinner color="primary"/>
            </div>
        )
    }

    const columns = [
        {
            key: 'type',
            label: 'Type',
            sorter: false,
        },
        {
            key: 'parentName',
            label: 'Client',
        },
        {   
            label: 'Time',
            key: 'formattedTime',
            _style: { width: '25%' },
        },
        {
            key: 'recipient',
            label: 'Recipient',
        },
        {
            key: 'amount',
            label: 'Amount',
        },
        {
            key: 'fund',
            _style: { width: '10%' },
        },
        {
            key: 'edit',
            label: '',
            _style: { width: '1%' },
            filter: false,
            sorter: false,
        },
        {
            key: 'delete',
            label: '',
            _style: { width: '1%' },
            filter: false,
            sorter: false,
        },
    ]

    const getBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'deposit':
                return 'success'
            case 'profit':
                return 'info'
            case 'income':
                return 'info'
            case 'pending':
                return 'warning'
            case 'withdrawal':
                return 'danger'
            default:
                return 'primary'
        }
      }

    function toSentenceCase(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    return (
        <CContainer>
            {showDeleteActivityModal && <DeleteActivity showModal={showDeleteActivityModal} setShowModal={setShowDeleteActivityModal} activity={currentActivity} selectedClient={selectedClient} setAllActivities={setAllActivities} setFilteredActivities={setFilteredActivities}/>}
            {showEditActivityModal && <EditActivity showModal={showEditActivityModal} setShowModal={setShowEditActivityModal} clients={clients} activity={currentActivity}  selectedClient={selectedClient} setAllActivities={setAllActivities} setFilteredActivities={setFilteredActivities}/>}
            <CRow className="justify-content-center py-3">
                <CCol>
                    <CMultiSelect
                            id="client"
                            className="mb-3a custom-multiselect-dropdown"
                            options={clientOptions}
                            placeholder="Type or select a specific client to view activities for"
                            selectAll={false}
                            multiple={false}
                            optionsStyle={'text'}
                            allowCreateOptions={false}
                            onChange={async (selectedValue) => {
                                let val: string | number | undefined
                                if (selectedValue.length > 0) {
                                    // If the client has selected an option, update the variable to the value
                                    val = selectedValue[0].value; 
                                } else {
                                    // If the selections have been cleared
                                    console.log('Selections cleared');
                                }
                                setSelectedClient(val);
                                if (val) {
                                    setFilteredActivities(allActivities.filter((activity) => activity.parentDocId === val));
                                } else {
                                    setFilteredActivities(allActivities)
                                }
                            }}
                        />
                </CCol>
                <CCol xl={2} style={{ float: 'left' }}>
                    <CButton
                        color="danger"
                        variant="outline"
                        shape="square"
                        className="w-100"
                        onClick={() => {
                            setClientOptions((prevOptions) =>
                                prevOptions.map((option) =>
                                    option.value === selectedClient ? { ...option, selected: false } : option
                                ) 
                            );
                            setFilteredActivities(allActivities); // Reset activities to original state
                        }}
                    >
                        Reset <CIcon icon={cilReload} />
                    </CButton>
                </CCol>
            </CRow>
            <CSmartTable
                activePage={1}
                cleaner
                clickableRows
                columns={columns}
                columnFilter
                columnSorter
                items={filteredActivities}
                itemsPerPageSelect
                itemsPerPage={20}
                pagination
                sorterValue={{ column: 'formattedTime', state: 'desc' }}
                scopedColumns={{
                    type: (item: Activity) => (
                        <td>
                            <CBadge color={getBadge(item.type)}>{toSentenceCase(item.type)}</CBadge>
                        </td>
                    ),
                    amount: (item: Activity) => (
                        <td>
                            {formatCurrency(item.amount)}
                        </td>
                    ),
                    edit: (item: Activity) => {
                        return (
                        <td className="py-2">
                            <CButton
                            color="warning"
                            variant="outline"
                            shape="square"
                            size="sm"
                            onClick={async () => {
                                setCurrentActivity(item);
                                setShowEditActivityModal(true);
                            }}
                            >
                            Edit
                            </CButton>
                        </td>
                        )
                    },
                    delete: (item: Activity) => {
                        return (
                        <td className="py-2">
                            <CButton
                            color="danger"
                            variant="outline"
                            shape="square"
                            size="sm"
                            onClick={() => {
                                setCurrentActivity(item);
                                setShowDeleteActivityModal(true);
                            }}
                            >
                            Delete
                            </CButton>
                            {/* <CToaster className="p-3" placement="top-end" push={toast} ref={toaster} /> */}
                        </td>
                        )
                    },
            }} />
        </CContainer>
    );
}

export default ActivitiesTable;