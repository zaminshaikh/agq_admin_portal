import React from 'react';
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from '@coreui/react-pro';

interface DeleteActivityProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    user: any; // Replace `any` with the appropriate type for `user`
}

const DeleteActivity: React.FC<DeleteActivityProps> = ({ showModal, setShowModal, user }) => {
    return (
        <CModal visible={showModal} onClose={() => setShowModal(false)}>
            <CModalHeader>
                <CModalTitle>Delete Activity</CModalTitle>
            </CModalHeader>
            <CModalBody>
                {/* Your content for confirming the deletion goes here */}
                <p>Are you sure you want to delete the activity for user</p>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={() => setShowModal(false)}>Cancel</CButton>
                <CButton color="danger" variant="outline" >Delete</CButton>
            </CModalFooter>
        </CModal>
    );
};

export default DeleteActivity;