import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { GoalSection } from './components/GoalSection';
import { SpendingCharts } from './components/SpendingCharts';
import { DataIngestion } from './components/DataIngestion';
import { BudgetSection } from './components/BudgetSection';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { fetchTransactions, fetchGoals } = useStore();

  useEffect(() => {
    fetchTransactions();
    fetchGoals();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'goals':
        return <GoalSection />;
      case 'analysis':
        return <SpendingCharts />;
      case 'data':
        return <DataIngestion onNavigate={setActiveTab} />;
      case 'budget':
        return <BudgetSection />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
