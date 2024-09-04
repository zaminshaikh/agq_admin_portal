import { SetStateAction, useEffect, useState } from "react";
import { CBadge, CButton, CCol, CContainer, CMultiSelect, CRow, CSmartTable, CSpinner } from "@coreui/react-pro";
import { Activity, DatabaseService, User, formatCurrency } from "src/db/database";
import { CreateActivity } from "./CreateActivity";
import DeleteActivity from "./DeleteActivity";
import EditActivity from "./EditActivity";
import { cilArrowRight, cilReload } from "@coreui/icons";
import CIcon from "@coreui/icons-react";
import type { Option } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import Activities from './Activities';

const ActivitiesTable = () => {
    const [isLoading, setIsLoading] = useState(true);

    const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
    const [allActivities, setAllActivities] = useState<Activity[]>([]); // New state for original activities
    const [users, setUsers] = useState<User[]>([]);
    const [userOptions, setUserOptions] = useState<Option[]>([]); 
    const [selectedUser, setSelectedUser] = useState<string | number>(); 

    const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
    const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
    const [showEditClientModal, setShowEditClientModal] = useState(false);

    const [currentActivity, setCurrentActivity] = useState<Activity | undefined>(undefined);
    
    useEffect(() => {
        const fetchActivities = async () => {
            const db = new DatabaseService();
            const activities = await db.getActivities();
            const users = await db.getUsers();

            setUserOptions(
                users!
                    .map(user => ({ value: user.cid, label: user.firstName + ' ' + user.lastName }))
                    .sort((a, b) => a.label.localeCompare(b.label))
            ); 
            setFilteredActivities(activities);
            setAllActivities(activities); // Store the original activities
            setUsers(users);

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
            key: 'recipient',
            label: 'Recipient',
        },
        {   
            label: 'Time',
            key: 'formattedTime',
            _style: { width: '30%' },
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
        switch (status) {
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
            {showDeleteClientModal && <DeleteActivity showModal={showDeleteClientModal} setShowModal={setShowDeleteClientModal} activity={currentActivity}/>}
            {showEditClientModal && <EditActivity showModal={showEditClientModal} setShowModal={setShowEditClientModal} users={users} activity={currentActivity}/>}
            {showCreateActivityModal && <CreateActivity showModal={showCreateActivityModal} setShowModal={setShowCreateActivityModal} users={users} selectedUser={selectedUser} setAllActivities={setAllActivities} setFilteredActivities={setFilteredActivities}/>}
            <div className="d-grid gap-2 py-3">
                <CButton color='primary' onClick={() => setShowCreateActivityModal(true)}>Add Activity +</CButton>
            </div> 
            <CRow className="justify-content-center py-3">
                <CCol>
                    <CMultiSelect
                            id="user"
                            className="mb-3a custom-multiselect-dropdown"
                            options={userOptions}
                            placeholder="Type or select a specific user to view activities for"
                            selectAll={false}
                            multiple={false}
                            allowCreateOptions={false}
                            onChange={async (selectedValue) => {
                                let val: string | number | undefined
                                if (selectedValue.length > 0) {
                                    // If the user has selected an option, update the variable to the value
                                    val = selectedValue[0].value; 
                                }
                                setSelectedUser(val);
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
                                setShowEditClientModal(true);
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
                                setShowDeleteClientModal(true);
                            }}
                            >
                            Delete
                            </CButton>
                        </td>
                        )
                    },
            }} />
        </CContainer>
    );
}

export default ActivitiesTable;