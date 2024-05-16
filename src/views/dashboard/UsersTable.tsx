import { CButton, CContainer, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle, CSmartTable, CSpinner } from '@coreui/react-pro';
import { getUsers, User } from 'src/db/database.ts';
import { useEffect, useState } from 'react';
import CreateNewClient from './CreateNewClient';

const UsersTable = () => {
    const [showModal, setShowModal] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            const users = await getUsers();
            setUsers(users);
            setIsLoading(false);
        };
        fetchUsers();
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
            key: 'cid',
            label: 'CID',
            filter: false,
            sorter: false,
        },
        {
            key: 'firstname',
            label: 'First',
            _style: { width: '15%'},
        },
        {
            key: 'lastname',
            label: 'Last',
            _style: { width: '15%'},
        },
        {
            key: 'email',
        },
        {
            key: 'formattedAssets',
            label: 'Assets (AUM)',
            formatter: (cellContent: number) => {
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cellContent);
            }
        }
    ]
    
    return (
        <CContainer>
            {showModal && <CreateNewClient showModal={showModal} setShowModal={setShowModal} users={users}/>} 
            <div className="d-grid gap-2">
                <CButton color='primary' onClick={() => setShowModal(true)}>Add Client +</CButton>
            </div> 
            <CSmartTable
                activePage={2}
                cleaner
                clickableRows
                columns={columns}
                columnFilter
                columnSorter
                items={users}
                itemsPerPageSelect
                itemsPerPage={5}
                pagination
            />
        </CContainer>
    )
}

export default UsersTable;