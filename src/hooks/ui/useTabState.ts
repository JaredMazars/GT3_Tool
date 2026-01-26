import { useState } from 'react';

export function useTabState() {
  const [activeTab, setActiveTab] = useState('overview');

  const switchToTab = (tab: string) => {
    setActiveTab(tab);
  };

  const isActiveTab = (tab: string) => activeTab === tab;

  return {
    activeTab,
    setActiveTab,
    switchToTab,
    isActiveTab,
  };
}

