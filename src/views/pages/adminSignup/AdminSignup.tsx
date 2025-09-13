import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { auth, app } from '../../../App';
import { 
  CCard, 
  CCardBody, 
  CCardHeader, 
  CContainer, 
  CRow, 
  CCol, 
  CForm, 
  CFormInput, 
  CInputGroup, 
  CInputGroupText, 
  CButton, 
  CAlert,
  CSpinner 
} from '@coreui/react-pro';
import { useNavigate } from 'react-router-dom';

const AdminSignup: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const functions = getFunctions(app);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );

      console.log('Firebase Auth account created:', userCredential.user.uid);

      // Call Cloud Function to create admin document
      const createAdminAccount = httpsCallable(functions, 'createAdminAccount');
      const result = await createAdminAccount({
        name: formData.name.trim(),
        email: formData.email.trim()
      });

      console.log('Admin account creation result:', result.data);

      setSuccess(true);
    } catch (error: any) {
      console.error('Error creating admin account:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <CContainer className="d-flex justify-content-center align-items-center min-vh-100">
        <CRow>
          <CCol md={8}>
            <CCard>
              <CCardHeader className="text-center">
                <h2>Account Created Successfully</h2>
              </CCardHeader>
              <CCardBody className="text-center">
                <CAlert color="success">
                  <h4>Welcome to the AGQ Admin Portal!</h4>
                  <p>Your admin account has been created and is pending approval.</p>
                  <p>You will be able to access the system once an administrator grants you permissions.</p>
                  <p className="mb-0">Please check back later or contact your administrator.</p>
                </CAlert>
                <div className="d-grid gap-2">
                  <CButton 
                    color="primary" 
                    onClick={() => navigate('/login')}
                  >
                    Go to Login
                  </CButton>
                  <CButton 
                    color="secondary" 
                    variant="outline"
                    onClick={() => auth.signOut()}
                  >
                    Sign Out
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    );
  }

  return (
    <CContainer className="d-flex justify-content-center align-items-center min-vh-100">
      <CRow>
        <CCol md={6}>
          <CCard>
            <CCardHeader className="text-center">
              <h3>Create Admin Account</h3>
              <p className="text-muted mb-0">Join the AGQ Admin Portal</p>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={handleSubmit}>
                <CInputGroup className="mb-3">
                  <CInputGroupText>Name</CInputGroupText>
                  <CFormInput
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </CInputGroup>
                
                <CInputGroup className="mb-3">
                  <CInputGroupText>Email</CInputGroupText>
                  <CFormInput
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </CInputGroup>
                
                <CInputGroup className="mb-3">
                  <CInputGroupText>Password</CInputGroupText>
                  <CFormInput
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
                  />
                </CInputGroup>
                
                <CInputGroup className="mb-4">
                  <CInputGroupText>Confirm</CInputGroupText>
                  <CFormInput
                    type="password"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    required
                  />
                </CInputGroup>

                {error && (
                  <CAlert color="danger" className="mb-3">
                    {error}
                  </CAlert>
                )}
                
                <div className="d-grid gap-2">
                  <CButton 
                    type="submit" 
                    color="primary" 
                    disabled={loading}
                    className="px-4"
                  >
                    {loading ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Admin Account'
                    )}
                  </CButton>
                  
                  <CButton 
                    color="secondary" 
                    variant="outline"
                    onClick={() => navigate('/login')}
                    disabled={loading}
                  >
                    Back to Login
                  </CButton>
                </div>
              </CForm>
              
              <div className="mt-4 text-center">
                <small className="text-muted">
                  After creating your account, you'll need approval from an administrator before you can access the portal.
                </small>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default AdminSignup;
