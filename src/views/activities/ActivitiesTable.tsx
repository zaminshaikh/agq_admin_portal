import { CBadge, CButton, CContainer, CSmartTable, CSpinner } from "@coreui/react-pro";
import { useEffect, useState } from "react";
import { Activity, DatabaseService, User, formatCurrency } from "src/db/database";
import { CreateActivity } from "./CreateActivity";


const ActivitiesTable = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [users, setUsers] = useState<User[]>([]); // [1
    const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
    
    useEffect(() => {
        const fetchActivities = async () => {
            const db = new DatabaseService();
            const activities = await db.getActivities();
            const users = await db.getUsers();
            setActivities(activities);
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
        }
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
            {showCreateActivityModal && <CreateActivity showModal={showCreateActivityModal} setShowModal={setShowCreateActivityModal} users={users}/>}
            <div className="d-grid gap-2">
                <CButton color='primary' onClick={() => setShowCreateActivityModal(true)}>Add Activity +</CButton>
            </div> 
            <CSmartTable
                activePage={1}
                cleaner
                clickableRows
                columns={columns}
                columnFilter
                columnSorter
                items={activities}
                itemsPerPageSelect
                itemsPerPage={50}
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
            }} />
        </CContainer>
    );
}

export default ActivitiesTable;