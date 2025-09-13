// ProtectedRoute.tsx
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth'; // You may need to install react-firebase-hooks
import { auth } from './App'; // Adjust the path as necessary
import { CSpinner, CAlert, CContainer } from '@coreui/react-pro';
import { usePermissions } from './contexts/PermissionContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    // auth.signOut();
    const [user, loading, error] = useAuthState(auth);
    const { admin, permissions, loading: adminLoading } = usePermissions();
    const location = useLocation();
    const [showAccessDenied, setShowAccessDenied] = useState(false);

    // Timer for showing access denied after 3 seconds
    useEffect(() => {
        console.log('🔍 ProtectedRoute Debug:', {
            loading,
            adminLoading,
            user: user ? { uid: user.uid, email: user.email } : null,
            admin,
            permissions,
            showAccessDenied
        });

        if (!loading && !adminLoading && user && (!admin || permissions === 'none')) {
            console.log('⏰ Starting 3-second timer for access denied');
            const timer = setTimeout(() => {
                console.log('🚫 Showing access denied after timeout');
                setShowAccessDenied(true);
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            setShowAccessDenied(false);
        }
    }, [loading, adminLoading, user, admin, permissions]);

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

    // Check if user is an admin with permissions - show spinner for 3 seconds before access denied
    if (!admin || permissions === 'none') {
        if (!showAccessDenied) {
            return (
                <div className="text-center mt-5">
                    <CSpinner color="primary" />
                    <p className="mt-3 text-muted">Verifying permissions...</p>
                </div>
            );
        }

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
