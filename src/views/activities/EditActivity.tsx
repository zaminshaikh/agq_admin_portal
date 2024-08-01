import React from 'react';
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from '@coreui/react-pro';

interface EditActivityProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    user: any; // Replace `any` with the appropriate type for `user`
}

const EditActivity: React.FC<EditActivityProps> = ({ showModal, setShowModal, user }) => {
    return (
        <CModal visible={showModal} onClose={() => setShowModal(false)}>
            <CModalHeader>
                <CModalTitle>Edit Activity</CModalTitle>
            </CModalHeader>
            <CModalBody>
                {/* Your form or content for editing the activity goes here */}
                <p>Editing activity for user</p>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={() => setShowModal(false)}>Close</CButton>
                <CButton color="primary">Save changes</CButton>
            </CModalFooter>
        </CModal>
    );
};

export default EditActivity;