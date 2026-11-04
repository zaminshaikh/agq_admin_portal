import React from 'react'
import { databaseId, isTesting } from '../db/firebaseEnvironment'

const TestingBanner = () => isTesting ? (
  <div role="status" style={{ padding: '10px 16px', background: '#fff3cd', color: '#664d03' }}>
    Testing: {databaseId}. Login is shared; account changes and email delivery are disabled.
  </div>
) : null

export default TestingBanner
