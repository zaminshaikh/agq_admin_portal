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
import { usePermissions } from "../../contexts/PermissionContext";

interface TableProps {
    scheduledActivities: ScheduledActivity[];
    setScheduledActivities: (activities: ScheduledActivity[]) => void;
    clients: Client[];
    setClients: (clients: Client[]) => void;

}

const ScheduledActivitiesTable: React.FC<TableProps> = ({scheduledActivities, setScheduledActivities, clients, setClients}) => {
    const { canWrite } = usePermissions();
    const [selectedClient, setSelectedClient] = useState<string | number | undefined>(undefined);

    const [showDeleteActivityModal, setShowDeleteActivityModal] = useState(false);
    const [showEditActivityModal, setShowEditActivityModal] = useState(false);

    const [currentActivity, setCurrentActivity] = useState<ScheduledActivity | undefined>(undefined);

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
          label: 'Scheduled Time',
          key: 'formattedTime',
          _style: { width: '20%' },
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
          key: 'status',
          label: 'Status',
          _style: { width: '8%' },
      },
      {
          key: 'fund',
          _style: { width: '7%' },
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
            case 'completed':
                return 'success'
            default:
                return 'primary'
        }
      }

    function toSentenceCase(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    return (
        <CContainer>
            <h1 className="pt-5 pb-2">Scheduled Activities</h1>
            {showDeleteActivityModal && <DeleteActivity showModal={showDeleteActivityModal} setShowModal={setShowDeleteActivityModal} activity={currentActivity?.activity} scheduledActivity={currentActivity} isScheduled={true} selectedClient={selectedClient} setScheduledActivities={setScheduledActivities}/>}
            {showEditActivityModal && <EditActivity showModal={showEditActivityModal} setShowModal={setShowEditActivityModal} clients={clients} activity={currentActivity?.activity} scheduledActivity={currentActivity} isScheduled={true} selectedClient={selectedClient} setScheduledActivities={setScheduledActivities} />}
            <CSmartTable
                activePage={1}
                cleaner
                clickableRows
                columns={columns}
                columnFilter
                columnSorter
                items={scheduledActivities}
                itemsPerPageSelect
                itemsPerPage={20}
                pagination
                sorterValue={{ column: 'formattedTime', state: 'desc' }}
                scopedColumns={{
                    type: (item: ScheduledActivity) => (
                        <td>
                            <CBadge color={getBadge(item.activity.type)}>{toSentenceCase(item.activity.type)}</CBadge>
                        </td>
                    ),
                    parentName: (item: ScheduledActivity) => (
                        <td>
                            {item.activity.parentName}
                        </td>
                    ),
                    scheduledTime: (item: ScheduledActivity) => (
                        <td>
                            {item.formattedTime}
                        </td>
                    ),
                    recipient: (item: ScheduledActivity) => (
                        <td>
                            {item.activity.recipient}
                        </td>
                    ),
                    amount: (item: ScheduledActivity) => (
                        <td>
                            {formatCurrency(item.activity.amount)}
                        </td>
                    ),
                    status: (item: any) => (
                        <td>
                            <CBadge color={getBadge(item.status)}>{toSentenceCase(item.status)}</CBadge>
                        </td>
                    ),
                    fund: (item: ScheduledActivity) => (
                        <td>
                            {item.activity.fund}
                        </td>
                    ),
                    edit: (item: any) => {
                        return (
                        <td className="py-2">
                            <CButton
                            color="warning"
                            variant="outline"
                            shape="square"
                            size="sm"
                            disabled={item.status === 'completed' || !canWrite}
                            onClick={async () => {
                                if (canWrite) { setCurrentActivity(item);
                                setShowEditActivityModal(true);
                                setSelectedClient(item.cid); }
                            }}
                            >
                            Edit
                            </CButton>
                        </td>
                        )
                    },
                    delete: (item: ScheduledActivity) => {
                        return (
                        <td className="py-2">
                            <CButton
                            disabled={!canWrite}
                            title={!canWrite ? "Read-only access - deletion disabled" : "Delete scheduled activity"}                            color="danger"
                            variant="outline"
                            shape="square"
                            size="sm"
                            onClick={() => {
                                if (canWrite) { setCurrentActivity(item);
                                setShowDeleteActivityModal(true);
                                setSelectedClient(item.cid); }
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