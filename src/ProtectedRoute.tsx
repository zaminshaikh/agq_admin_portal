// ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth'; // You may need to install react-firebase-hooks
import { auth } from './App'; // Adjust the path as necessary
import { CSpinner, CAlert, CContainer } from '@coreui/react-pro';
import { usePermissions } from './contexts/PermissionContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    // auth.signOut();
    const [user, loading, error] = useAuthState(auth);
    const { admin, loading: adminLoading } = usePermissions();
    const location = useLocation();

    if (loading || adminLoading) {
        return (
            <div className="text-center mt-5">
                <CSpinner color="primary" />
                <p className="mt-3 text-muted">Loading...</p>
            </div>
        );
    }

    if (error) {
        console.error('Error fetching auth state:', error);
        return <Navigate to="/500" state={{ from: location }} replace />
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Check if user is an admin with permissions
    if (!admin || !admin.permissions) {
        return (
            <CContainer className="text-center mt-5">
                <CAlert color="warning">
                    <h4>Access Denied</h4>
                    <p>You need to request access from an administrator to use this portal.</p>
                    <p>Your email: {user.email}</p>
                    <button onClick={() => auth.signOut()} className="btn btn-secondary mt-3">
                        Sign Out
                    </button>
                </CAlert>
            </CContainer>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
