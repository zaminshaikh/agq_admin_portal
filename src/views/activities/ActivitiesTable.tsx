import { SetStateAction, useEffect, useRef, useState } from "react";
import { CBadge, CButton, CCol, CContainer, CMultiSelect, CRow, CSmartTable, CSpinner, CToaster } from "@coreui/react-pro";
import { Activity, DatabaseService, Client, formatCurrency } from "src/db/database";
import { CreateActivity } from "./CreateActivity";
import DeleteActivity from "./DeleteActivity";
import EditActivity from "./EditActivity";
import { cilArrowRight, cilReload, cilTrash } from "@coreui/icons";
import CIcon from "@coreui/icons-react";
import type { Option } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import Activities from './Activities';
import { faExclamationTriangle, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DeleteSelectedActivities from './DeleteSelectedActivities';
import { toSentenceCase } from "src/utils/utilities";
import { usePermissions } from "../../contexts/PermissionContext";

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
    const { canWrite, canRead } = usePermissions();
    const [isHovered, setIsHovered] = useState(false);

    const [clientOptions, setClientOptions] = useState<Option[]>(
      clients
        .map(client => ({ value: client.cid, label: client.firstName + ' ' + client.lastName }))
          .sort((a, b) => a.label.localeCompare(b.label))
    ); 

    const [showEditActivityModal, setShowEditActivityModal] = useState(false);
    const [showDeleteActivityModal, setShowDeleteActivityModal] = useState(false);
    const [showDeleteSelectedButton, setShowDeleteSelectedButton] = useState(false);
    const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);
    const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);

    const [currentActivity, setCurrentActivity] = useState<Activity | undefined>(undefined);

    useEffect(() => {
        if (selectedActivities.length > 0) {
            setShowDeleteSelectedButton(true);
        } else {
            setShowDeleteSelectedButton(false);
        }
    }, [selectedActivities]);


    const baseColumns = [
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
    ]

    const writeColumns = [
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

    // Show write columns for all authenticated users, but disable functionality for read-only users
    const columns = (canRead || canWrite) ? [...baseColumns, ...writeColumns] : baseColumns

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

    return (

        <CContainer>
            {showDeleteActivityModal && <DeleteActivity showModal={showDeleteActivityModal} setShowModal={setShowDeleteActivityModal} activity={currentActivity} selectedClient={selectedClient} setAllActivities={setAllActivities} setFilteredActivities={setFilteredActivities}/>}
            {showEditActivityModal && <EditActivity showModal={showEditActivityModal} setShowModal={setShowEditActivityModal} clients={clients} activity={currentActivity}  selectedClient={selectedClient} setAllActivities={setAllActivities} setFilteredActivities={setFilteredActivities}/>}
            {showDeleteSelectedModal && (
                <DeleteSelectedActivities
                    showModal={showDeleteSelectedModal}
                    setShowModal={setShowDeleteSelectedModal}
                    selectedActivities={selectedActivities}
                    setSelectedActivities={setSelectedActivities}
                    allActivities={allActivities}
                    setAllActivities={setAllActivities}
                    filteredActivities={filteredActivities}
                    setFilteredActivities={setFilteredActivities}
                    selectedClient={selectedClient}
                />
            )}
            {showDeleteSelectedButton && (canRead || canWrite) && <div
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '58%',
                    transform: 'translateX(-50%)',
                    zIndex: 999,
                    boxShadow: '2px 5px 5px rgba(0, 0, 0, 0.2)',
                }}
            >
                <CButton
                    style={{ 
                        backgroundColor: isHovered ? '#D1464B' : '#191C25',
                        // opacity: isHovered ? 0.9 : 1,
                        boxShadow: '2px 4px 4px rgba(0, 0, 0, 0.05)',
                        borderColor: '#D1464B',
                        borderWidth: '1.5px',
                        padding: '8px 72px',
                        fontSize: '1.1rem',
                        // fontWeight: 'bold'
                    }}
                    className={isHovered ? 'text-light' : 'text-danger'}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={() => canWrite ? setShowDeleteSelectedModal(true) : null}
                    disabled={!canWrite}
                >
                    <CIcon icon={cilTrash} className="me-2" /> Delete {selectedActivities.length} {selectedActivities.length > 1 ? 'Activities' : 'Activity'}
                </CButton>
            </div>}
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
                selectable={canRead || canWrite}
                selected={(canRead || canWrite) ? selectedActivities : []} 
                onSelectedItemsChange={(items) => {
                    if (canWrite) {
                        setSelectedActivities(items as Activity[]);
                    } else if (canRead) {
                        // Allow selection for read-only users but don't enable bulk actions
                        setSelectedActivities(items as Activity[]);
                    }
                }}
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
                    ...((canRead || canWrite) && {
                        edit: (item: Activity) => {
                            return (
                            <td className="py-2">
                                <CButton
                                color="warning"
                                variant="outline"
                                shape="square"
                                size="sm"
                                disabled={!canWrite}
                                onClick={async () => {
                                    if (canWrite) {
                                        setCurrentActivity(item);
                                        setShowEditActivityModal(true);
                                    }
                                }}
                                title={!canWrite ? "Read-only access - editing disabled" : "Edit activity"}
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
                                disabled={!canWrite}
                                onClick={() => {
                                    if (canWrite) {
                                        setCurrentActivity(item);
                                        setShowDeleteActivityModal(true);
                                    }
                                }}
                                title={!canWrite ? "Read-only access - deletion disabled" : "Delete activity"}
                                >
                                Delete
                                </CButton>
                                {/* <CToaster className="p-3" placement="top-end" push={toast} ref={toaster} /> */}
                            </td>
                            )
                        },
                    })
                }} />
        </CContainer>
    );
}

export default ActivitiesTable;