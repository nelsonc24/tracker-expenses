import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface DebtReminderEmailProps {
  debtName: string
  creditorName: string
  minimumPayment: string
  currentBalance: string
  dueDate: string
  daysUntilDue: number
  userName?: string
}

export const DebtReminderEmail = ({
  debtName,
  creditorName,
  minimumPayment,
  currentBalance,
  dueDate,
  daysUntilDue,
  userName = 'there',
}: DebtReminderEmailProps) => {
  const urgencyColor = daysUntilDue <= 1 ? '#dc2626' : daysUntilDue <= 3 ? '#f59e0b' : '#3b82f6'
  const urgencyMessage = 
    daysUntilDue === 0 
      ? 'Today!' 
      : daysUntilDue === 1 
      ? 'Tomorrow' 
      : `in ${daysUntilDue} days`

  return (
    <Html>
      <Head />
      <Preview>
        Debt payment reminder: {debtName} - {minimumPayment} due {urgencyMessage}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            💳 Debt Payment Reminder
          </Heading>
          
          <Text style={text}>Hi {userName},</Text>
          
          <Text style={text}>
            You have a debt payment coming up soon:
          </Text>

          <Section style={debtCard}>
            <Text style={debtNameStyle}>
              {debtName}
            </Text>
            
            <Text style={creditorText}>
              {creditorName}
            </Text>
            
            <Hr style={hr} />
            
            <div style={detailsContainer}>
              <div style={detailRow}>
                <Text style={detailLabel}>Minimum Payment:</Text>
                <Text style={detailValue}>{minimumPayment}</Text>
              </div>
              
              <div style={detailRow}>
                <Text style={detailLabel}>Current Balance:</Text>
                <Text style={detailValue}>{currentBalance}</Text>
              </div>
              
              <div style={detailRow}>
                <Text style={detailLabel}>Due Date:</Text>
                <Text style={detailValue}>{dueDate}</Text>
              </div>
              
              <div style={detailRow}>
                <Text style={detailLabel}>Status:</Text>
                <Text style={{ ...detailValue, color: urgencyColor }}>
                  Due {urgencyMessage}
                </Text>
              </div>
            </div>
          </Section>

          <Section style={ctaSection}>
            <Button style={button} href={`${process.env.NEXT_PUBLIC_APP_URL}/debts`}>
              View Debts Dashboard
            </Button>
          </Section>

          <Text style={noteText}>
            💡 Tip: Paying more than the minimum can help you save on interest and pay off your debt faster!
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            You&apos;re receiving this email because you have debt reminders enabled in your Expense Tracker settings.
            <br />
            <a href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`} style={link}>
              Manage notification preferences
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default DebtReminderEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '8px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
  textAlign: 'center' as const,
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
}

const debtCard = {
  margin: '24px 40px',
  padding: '24px',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  border: '1px solid #fecaca',
}

const debtNameStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#111827',
  margin: '0 0 4px',
}

const creditorText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 16px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const detailsContainer = {
  margin: '16px 0 0',
}

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
}

const detailLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: 0,
}

const detailValue = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  margin: 0,
}

const ctaSection = {
  padding: '0 40px',
  textAlign: 'center' as const,
  marginTop: '32px',
}

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const noteText = {
  fontSize: '14px',
  color: '#6b7280',
  fontStyle: 'italic',
  marginTop: '20px',
  backgroundColor: '#eff6ff',
  borderLeft: '4px solid #3b82f6',
  padding: '12px 16px',
  marginLeft: '40px',
  marginRight: '40px',
}

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  marginTop: '32px',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
}
