'use client';

import { useState, useEffect } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ProcessingModal } from './ProcessingModal';

interface FileUploadProps {
  onFileUpload: (data: unknown) => void;
  projectId: number;
}

interface ProcessingStage {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'complete';
}

export function FileUpload({ onFileUpload, projectId }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([
    {
      id: 1,
      title: 'Parsing Trial Balance',
      description: 'Reading and validating your Excel file...',
      status: 'pending'
    },
    {
      id: 2,
      title: 'Mapping Income Statement',
      description: 'Using AI to map income statement accounts to SARS categories...',
      status: 'pending'
    },
    {
      id: 3,
      title: 'Mapping Balance Sheet',
      description: 'Using AI to map balance sheet accounts to SARS categories...',
      status: 'pending'
    },
    {
      id: 4,
      title: 'Saving to Database',
      description: 'Storing mapped accounts in the database...',
      status: 'pending'
    }
  ]);

  // Reset stages to initial state when not loading
  useEffect(() => {
    if (!isLoading) {
      setProcessingStages([
        {
          id: 1,
          title: 'Parsing Trial Balance',
          description: 'Reading and validating your Excel file...',
          status: 'pending'
        },
        {
          id: 2,
          title: 'Mapping Income Statement',
          description: 'Using AI to map income statement accounts to SARS categories...',
          status: 'pending'
        },
        {
          id: 3,
          title: 'Mapping Balance Sheet',
          description: 'Using AI to map balance sheet accounts to SARS categories...',
          status: 'pending'
        },
        {
          id: 4,
          title: 'Saving to Database',
          description: 'Storing mapped accounts in the database...',
          status: 'pending'
        }
      ]);
    }
  }, [isLoading]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('trialBalance', selectedFile);
      formData.append('projectId', projectId.toString());
      formData.append('stream', 'true'); // Enable streaming

      const response = await fetch('/api/map', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData = null;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'error') {
              throw new Error(data.message);
            } else if (data.type === 'complete') {
              finalData = data.data;
            } else if (data.stage && data.status) {
              // Update stage status
              setProcessingStages(prev => prev.map(stage => {
                if (stage.id === data.stage) {
                  return { ...stage, status: data.status };
                } else if (stage.id < data.stage) {
                  return { ...stage, status: 'complete' };
                } else if (stage.id === data.stage + 1 && data.status === 'complete') {
                  return { ...stage, status: 'in-progress' };
                }
                return stage;
              }));
            }
          }
        }
      }

      if (finalData) {
        // Brief delay to show completion before closing modal
        setTimeout(() => {
          onFileUpload(finalData);
          setIsLoading(false);
        }, 800);
      } else {
        throw new Error('No data received from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setIsLoading(false);
    }
  };

  return (
    <>
      <ProcessingModal isOpen={isLoading} stages={processingStages} />
      
      <div className="space-y-8">
        {/* Format Guide Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-100">
        <div className="flex items-start space-x-4">
          <DocumentTextIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
          <div className="space-y-4 w-full">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Excel File Format Requirements</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please ensure your Trial Balance Excel file includes these columns:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['Account Code', 'Account', 'Section', 'Balance', 'Prior Year Balance'].map((column) => (
                  <div key={column} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                    <p className="text-sm font-medium text-blue-700">{column}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center space-x-2 mb-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                <h4 className="text-sm font-medium text-gray-900">Important Notes:</h4>
              </div>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-1">
                <li>The <span className="font-medium">Section</span> column must contain either &quot;Balance Sheet&quot; or &quot;Income Statement&quot;</li>
                <li>The <span className="font-medium">Balance</span> column should contain current year numerical values</li>
                <li>The <span className="font-medium">Prior Year Balance</span> column should contain prior year numerical values (use 0 if no prior year data)</li>
                <li>All columns are required for proper comparative reporting</li>
                <li>Ensure there are no empty cells in any columns</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Example Excel Format:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Account Code</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Account</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Section</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Balance</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Prior Year Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="px-4 py-2 text-gray-900">1000</td>
                      <td className="px-4 py-2 text-gray-900">Cash at Bank</td>
                      <td className="px-4 py-2 text-gray-900">Balance Sheet</td>
                      <td className="px-4 py-2 text-right text-gray-900">50000.00</td>
                      <td className="px-4 py-2 text-right text-gray-900">45000.00</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-900">4000</td>
                      <td className="px-4 py-2 text-gray-900">Sales Revenue</td>
                      <td className="px-4 py-2 text-gray-900">Income Statement</td>
                      <td className="px-4 py-2 text-right text-gray-900">-75000.00</td>
                      <td className="px-4 py-2 text-right text-gray-900">-70000.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Form Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Upload Trial Balance</span>
              <div
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors duration-200
                  ${isDragging ? 'border-blue-500 bg-blue-50' : ''}
                  ${selectedFile ? 'border-green-500 bg-green-50' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && document.getElementById('file-upload')?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={!!selectedFile}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center space-y-2">
                    <DocumentTextIcon className="h-12 w-12 text-green-500" />
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <>
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Drag and drop your trial balance file here, or{' '}
                      <span className="text-blue-600 hover:text-blue-700">click to browse</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Only Excel files (.xlsx, .xls) are supported
                    </p>
                  </>
                )}
              </div>
            </label>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className={`w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white
              ${isLoading || !selectedFile
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              } 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Upload and Map'
            )}
          </button>
        </form>
      </div>
    </div>
    </>
  );
} 