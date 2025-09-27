"use client"

import { useState, useEffect } from 'react'
import { TransactionsPageClient } from './client'

interface Transaction {
  id: string
  description: string
  amount: number
  category: string
  categoryId: string | null
  date: string
  account: string
  accountId: string | null
  type: 'debit' | 'credit' | 'transfer'
  merchant?: string
  reference?: string
  tags?: string[]
  notes?: string
}

interface Account {
  id: string
  name: string
  institution: string
  accountType: string
  balance: string
}

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface Activity {
  id: string
  name: string
  description?: string
  color?: string
}

interface Budget {
  id: string
  name: string
  amount: number
  categoryIds: string[]
  period: string
  startDate: string
  endDate?: string
  isActive: boolean
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        console.log('Fetching transactions with limit=10000...')
        
        // Fetch all data in parallel - request all transactions (limit=10000 to get all)
        // Force reload to see all imported transactions
        const [transactionsResponse, accountsResponse, categoriesResponse, activitiesResponse, budgetsResponse] = await Promise.all([
          fetch('/api/transactions?limit=10000'),
          fetch('/api/accounts'),
          fetch('/api/categories'),
          fetch('/api/activities'),
          fetch('/api/budgets')
        ])

        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json()
          console.log(`Received ${transactionsData.length} transactions from API`)
          setTransactions(transactionsData)
        }

        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json()
          setAccounts(accountsData)
        }

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData)
        }

        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json()
          setActivities(activitiesData)
        }

        if (budgetsResponse.ok) {
          const budgetsData = await budgetsResponse.json()
          setBudgets(budgetsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleTransactionUpdate = async (transaction: Transaction) => {
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      })

      if (response.ok) {
        const updatedTransaction = await response.json()
        setTransactions(prev => 
          prev.map(t => t.id === transaction.id ? updatedTransaction : t)
        )
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    }
  }

  const handleTransactionDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id))
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  const handleTransactionCreate = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      })

      if (response.ok) {
        const newTransaction = await response.json()
        setTransactions(prev => [newTransaction, ...prev])
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
    }
  }

  return (
    <TransactionsPageClient
      transactions={transactions}
      accounts={accounts}
      categories={categories}
      activities={activities}
      budgets={budgets}
      loading={loading}
      onTransactionUpdate={handleTransactionUpdate}
      onTransactionDelete={handleTransactionDelete}
      onTransactionCreate={handleTransactionCreate}
    />
  )
}
