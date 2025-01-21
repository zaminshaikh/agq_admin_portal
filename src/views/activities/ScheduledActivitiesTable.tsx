import { SetStateAction, useEffect, useRef, useState } from "react";
import { CBadge, CButton, CCol, CContainer, CHeader, CHeaderBrand, CMultiSelect, CRow, CSmartTable, CSpinner, CToaster } from "@coreui/react-pro";
import { Activity, DatabaseService, Client, formatCurrency, ScheduledActivity } from "src/db/database";
import { CreateActivity } from "./CreateActivity";
import DeleteActivity from "./DeleteActivity";
import EditActivity from "./EditActivity";
import { cilArrowRight, cilReload } from "@coreui/icons";
import CIcon from "@coreui/icons-react";
import type { Option } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import Activities from './Activities';

const ScheduledActivitiesTable = () => {
    const [isLoading, setIsLoading] = useState(true);

    const [allActivities, setAllActivities] = useState<ScheduledActivity[]>([]); // New state for original activities
    const [clients, setClients] = useState<Client[]>([]);

    const [showDeleteActivityModal, setShowDeleteActivityModal] = useState(false);
    const [showEditActivityModal, setShowEditActivityModal] = useState(false);

    const [currentActivity, setCurrentActivity] = useState<Activity | undefined>(undefined);
    
    useEffect(() => {
        const fetchActivities = async () => {
            const db = new DatabaseService();
            const activities = await db.getScheduledActivities();
            const clients = await db.getClients();

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
            <CHeaderBrand>Test</CHeaderBrand>
            {/* {showDeleteActivityModal && <DeleteActivity showModal={showDeleteActivityModal} setShowModal={setShowDeleteActivityModal} activity={currentActivity} selectedClient={selectedClient} setAllActivities={setAllActivities} setFilteredActivities={() => {}}/>}
            {showEditActivityModal && <EditActivity showModal={showEditActivityModal} setShowModal={setShowEditActivityModal} clients={clients} activity={currentActivity}  selectedClient={selectedClient} setAllActivities={setAllActivities} setFilteredActivities={() => {}}/>} */}
            <CSmartTable
                activePage={1}
                cleaner
                clickableRows
                columns={columns}
                columnFilter
                columnSorter
                items={allActivities.map((scheduledActivity) => scheduledActivity.activity)}
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

export default ScheduledActivitiesTable;