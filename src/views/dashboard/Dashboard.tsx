import React from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

import {
  CAvatar,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cibCcAmex,
  cibCcApplePay,
  cibCcMastercard,
  cibCcPaypal,
  cibCcStripe,
  cibCcVisa,
  cibGoogle,
  cibFacebook,
  cibLinkedin,
  cifBr,
  cifEs,
  cifFr,
  cifIn,
  cifPl,
  cifUs,
  cibTwitter,
  cilCloudDownload,
  cilPeople,
  cilUser,
  cilUserFemale,
} from '@coreui/icons'

import avatar1 from 'src/assets/images/avatars/1.jpg'
import avatar2 from 'src/assets/images/avatars/2.jpg'
import avatar3 from 'src/assets/images/avatars/3.jpg'
import avatar4 from 'src/assets/images/avatars/4.jpg'
import avatar5 from 'src/assets/images/avatars/5.jpg'
import avatar6 from 'src/assets/images/avatars/6.jpg'

import WidgetsBrand from '../widgets/WidgetsBrand'
import WidgetsDropdown from '../widgets/WidgetsDropdown'
import MainChart from './MainChart'

const Dashboard = () => {
  const { t } = useTranslation()

  const progressExample = [
    {
      title: t('visits'),
      value: t('usersCounter', { counter: '29.703' }),
      percent: 40,
      color: 'success',
    },
    {
      title: t('unique'),
      value: t('usersCounter', { counter: '24.093' }),
      percent: 20,
      color: 'info',
    },
    {
      title: t('pageviews'),
      value: t('viewsCounter', { counter: '78.706' }),
      percent: 60,
      color: 'warning',
    },
    {
      title: t('newUsers'),
      value: t('usersCounter', { counter: '22.123' }),
      percent: 80,
      color: 'danger',
    },
    { title: t('bounceRate'), value: '', percent: 40.15, color: 'primary' },
  ]

  const progressGroupExample1 = [
    { title: t('monday'), value1: 34, value2: 78 },
    { title: t('tuesday'), value1: 56, value2: 94 },
    { title: t('wednesday'), value1: 12, value2: 67 },
    { title: t('thursday'), value1: 43, value2: 91 },
    { title: t('friday'), value1: 22, value2: 73 },
    { title: t('saturday'), value1: 53, value2: 82 },
    { title: t('sunday'), value1: 9, value2: 69 },
  ]

  const progressGroupExample2 = [
    { title: t('male'), icon: cilUser, value: 53 },
    { title: t('female'), icon: cilUserFemale, value: 43 },
  ]

  const progressGroupExample3 = [
    { title: t('organicSearch'), icon: cibGoogle, percent: 56, value: '191,235' },
    { title: 'Facebook', icon: cibFacebook, percent: 15, value: '51,223' },
    { title: 'Twitter', icon: cibTwitter, percent: 11, value: '37,564' },
    { title: 'LinkedIn', icon: cibLinkedin, percent: 8, value: '27,319' },
  ]

  const tableExampleUsagePeriod = (dateStart: Date, dateEnd: Date) => {
    const formatParams = { date: { year: 'numeric', month: 'short', day: 'numeric' } }
    return `${t('date', {
      date: dateStart,
      formatParams,
    })} - ${t('date', {
      date: dateEnd,
      formatParams,
    })}`
  }

  const tableExample = [
    {
      avatar: { src: avatar1, status: 'success' },
      user: {
        name: 'Yiorgos Avraamu',
        new: true,
        registered: t('date', {
          date: new Date(2023, 0, 10),
          formatParams: { date: { year: 'numeric', month: 'short', day: 'numeric' } },
        }),
      },
      country: { name: 'USA', flag: cifUs },
      usage: {
        value: 50,
        period: tableExampleUsagePeriod(new Date(2023, 5, 11), new Date(2023, 6, 10)),
        color: 'success',
      },
      payment: { name: 'Mastercard', icon: cibCcMastercard },
      activity: t('relativeTime', { val: -10, range: 'seconds' }),
    },
    {
      avatar: { src: avatar2, status: 'danger' },
      user: {
        name: 'Avram Tarasios',
        new: false,
        registered: t('date', {
          date: new Date(2023, 0, 10),
          formatParams: { date: { year: 'numeric', month: 'short', day: 'numeric' } },
        }),
      },
      country: { name: 'Brazil', flag: cifBr },
      usage: {
        value: 22,
        period: tableExampleUsagePeriod(new Date(2023, 5, 11), new Date(2023, 6, 10)),
        color: 'info',
      },
      payment: { name: 'Visa', icon: cibCcVisa },
      activity: t('relativeTime', { val: -5, range: 'minutes' }),
    },
    {
      avatar: { src: avatar3, status: 'warning' },
      user: {
        name: 'Quintin Ed',
        new: true,
        registered: t('date', {
          date: new Date(2023, 0, 10),
          formatParams: { date: { year: 'numeric', month: 'short', day: 'numeric' } },
        }),
      },
      country: { name: 'India', flag: cifIn },
      usage: {
        value: 74,
        period: tableExampleUsagePeriod(new Date(2023, 5, 11), new Date(2023, 6, 10)),
        color: 'warning',
      },
      payment: { name: 'Stripe', icon: cibCcStripe },
      activity: t('relativeTime', { val: -1, range: 'hours' }),
    },
    {
      avatar: { src: avatar4, status: 'secondary' },
      user: {
        name: 'Enéas Kwadwo',
        new: true,
        registered: t('date', {
          date: new Date(2023, 0, 10),
          formatParams: { date: { year: 'numeric', month: 'short', day: 'numeric' } },
        }),
      },
      country: { name: 'France', flag: cifFr },
      usage: {
        value: 98,
        period: tableExampleUsagePeriod(new Date(2023, 5, 11), new Date(2023, 6, 10)),
        color: 'danger',
      },
      payment: { name: 'PayPal', icon: cibCcPaypal },
      activity: t('relativeTime', { val: -1, range: 'weeks' }),
    },
    {
      avatar: { src: avatar5, status: 'success' },
      user: {
        name: 'Agapetus Tadeáš',
        new: true,
        registered: t('date', {
          date: new Date(2023, 0, 10),
          formatParams: { date: { year: 'numeric', month: 'short', day: 'numeric' } },
        }),
      },
      country: { name: 'Spain', flag: cifEs },
      usage: {
        value: 22,
        period: tableExampleUsagePeriod(new Date(2023, 5, 11), new Date(2023, 6, 10)),
        color: 'primary',
      },
      payment: { name: 'Google Wallet', icon: cibCcApplePay },
      activity: t('relativeTime', { val: -3, range: 'months' }),
    },
    {
      avatar: { src: avatar6, status: 'danger' },
      user: {
        name: 'Friderik Dávid',
        new: true,
        registered: t('date', {
          date: new Date(2023, 0, 10),
          formatParams: { date: { year: 'numeric', month: 'short', day: 'numeric' } },
        }),
      },
      country: { name: 'Poland', flag: cifPl },
      usage: {
        value: 43,
        period: tableExampleUsagePeriod(new Date(2023, 5, 11), new Date(2023, 6, 10)),
        color: 'success',
      },
      payment: { name: 'Amex', icon: cibCcAmex },
      activity: t('relativeTime', { val: -1, range: 'years' }),
    },
  ]

  return (
    <>
      <WidgetsDropdown className="mb-4" />
      <CCard className="mb-4">
        <CCardBody>
          <CRow>
            <CCol sm={5}>
              <h4 id="traffic" className="card-title mb-0">
                {t('traffic')}
              </h4>
              <div className="small text-body-secondary">
                {' '}
                {t('date', {
                  date: new Date(2023, 0, 1),
                  formatParams: {
                    date: {
                      month: 'long',
                    },
                  },
                })}{' '}
                -{' '}
                {t('date', {
                  date: new Date(2023, 6, 1),
                  formatParams: {
                    date: {
                      year: 'numeric',
                      month: 'long',
                    },
                  },
                })}
              </div>
            </CCol>
            <CCol sm={7} className="d-none d-md-block">
              <CButton color="primary" className="float-end">
                <CIcon icon={cilCloudDownload} />
              </CButton>
              <CButtonGroup className="float-end me-3">
                {[t('day'), t('month'), t('year')].map((value, index) => (
                  <CButton
                    color="outline-secondary"
                    key={value}
                    className="mx-0"
                    active={index === 1}
                  >
                    {value}
                  </CButton>
                ))}
              </CButtonGroup>
            </CCol>
          </CRow>
          <MainChart />
        </CCardBody>
        <CCardFooter>
          <CRow
            xs={{ cols: 1, gutter: 4 }}
            sm={{ cols: 2 }}
            lg={{ cols: 4 }}
            xl={{ cols: 5 }}
            className="mb-2 text-center"
          >
            {progressExample.map((item, index, items) => (
              <CCol
                className={classNames({
                  'd-none d-xl-block': index + 1 === items.length,
                })}
                key={index}
              >
                <div className="text-body-secondary">{item.title}</div>
                <div className="fw-semibold text-truncate">
                  {item.value} ({item.percent}%)
                </div>
                <CProgress
                  thin
                  className="mt-2"
                  color={`${item.color}-gradient`}
                  value={item.percent}
                />
              </CCol>
            ))}
          </CRow>
        </CCardFooter>
      </CCard>
      <WidgetsBrand className="mb-4" withCharts />
      <CRow>
        <CCol xs>
          <CCard className="mb-4">
            <CCardHeader>{t('trafficAndSales')}</CCardHeader>
            <CCardBody>
              <CRow>
                <CCol xs={12} md={6} xl={6}>
                  <CRow>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-info py-1 px-3">
                        <div className="text-body-secondary text-truncate small">
                          {t('newClients')}
                        </div>
                        <div className="fs-5 fw-semibold">9,123</div>
                      </div>
                    </CCol>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-danger py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          {t('recurringClients')}
                        </div>
                        <div className="fs-5 fw-semibold">22,643</div>
                      </div>
                    </CCol>
                  </CRow>

                  <hr className="mt-0" />
                  {progressGroupExample1.map((item, index) => (
                    <div className="progress-group mb-4" key={index}>
                      <div className="progress-group-prepend">
                        <span className="text-body-secondary small">{item.title}</span>
                      </div>
                      <div className="progress-group-bars">
                        <CProgress thin color="info-gradient" value={item.value1} />
                        <CProgress thin color="danger-gradient" value={item.value2} />
                      </div>
                    </div>
                  ))}
                </CCol>

                <CCol xs={12} md={6} xl={6}>
                  <CRow>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          {t('pageviews')}
                        </div>
                        <div className="fs-5 fw-semibold">78,623</div>
                      </div>
                    </CCol>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          {t('organic')}
                        </div>
                        <div className="fs-5 fw-semibold">49,123</div>
                      </div>
                    </CCol>
                  </CRow>

                  <hr className="mt-0" />

                  {progressGroupExample2.map((item, index) => (
                    <div className="progress-group mb-4" key={index}>
                      <div className="progress-group-header">
                        <CIcon className="me-2" icon={item.icon} size="lg" />
                        <span>{item.title}</span>
                        <span className="ms-auto fw-semibold">{item.value}%</span>
                      </div>
                      <div className="progress-group-bars">
                        <CProgress thin color="warning-gradient" value={item.value} />
                      </div>
                    </div>
                  ))}

                  <div className="mb-5"></div>

                  {progressGroupExample3.map((item, index) => (
                    <div className="progress-group" key={index}>
                      <div className="progress-group-header">
                        <CIcon className="me-2" icon={item.icon} size="lg" />
                        <span>{item.title}</span>
                        <span className="ms-auto fw-semibold">
                          {item.value}{' '}
                          <span className="text-body-secondary small">({item.percent}%)</span>
                        </span>
                      </div>
                      <div className="progress-group-bars">
                        <CProgress thin color="success-gradient" value={item.percent} />
                      </div>
                    </div>
                  ))}
                </CCol>
              </CRow>

              <br />

              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      <CIcon icon={cilPeople} />
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">{t('user')}</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      {t('country')}
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">{t('usage')}</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      {t('paymentMethod')}
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">
                      {t('activity')}
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {tableExample.map((item, index) => (
                    <CTableRow v-for="item in tableItems" key={index}>
                      <CTableDataCell className="text-center">
                        <CAvatar size="md" src={item.avatar.src} status={item.avatar.status} />
                      </CTableDataCell>
                      <CTableDataCell>
                        <div>{item.user.name}</div>
                        <div className="small text-body-secondary text-nowrap">
                          <span>{item.user.new ? t('new') : t('recurring')}</span> |{' '}
                          {t('registered')}
                          {item.user.registered}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CIcon size="xl" icon={item.country.flag} title={item.country.name} />
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex justify-content-between align-items-baseline text-nowrap">
                          <div className="fw-semibold">{item.usage.value}%</div>
                          <div className="text-body-secondary small ms-3">{item.usage.period}</div>
                        </div>
                        <CProgress
                          thin
                          color={`${item.usage.color}-gradient`}
                          value={item.usage.value}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CIcon size="xl" icon={item.payment.icon} />
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="small text-body-secondary text-nowrap">
                          {t('lastLogin')}
                        </div>
                        <div className="fw-semibold text-nowrap">{item.activity}</div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard
