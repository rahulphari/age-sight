import React, { useState, useCallback, useMemo, DragEvent } from 'react';
import type { AnalysisResult, B2CAnalysisResult, B2BAnalysisResult, SortConfig, B2CProcessedRow, B2BProcessedRow } from './types';
import { WBN_BASE_URL, GOOGLE_SHEET_URL, DEFAULT_FACILITY } from './constants';
import { processCsvData, syncWithGoogleSheet } from './services/api';

// --- HELPER COMPONENTS (V2.0 STYLING) ---

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    isLoading: boolean;
    error: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading, error }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');

    const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) handleFile(files[0]);
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) handleFile(files[0]);
    };
    const handleFile = (file: File) => {
        if (!file || !file.type.match('text/csv')) {
            alert("Please upload a valid CSV file.");
            return;
        }
        setFileName(file.name);
        onFileSelect(file);
    };

    const labelClasses = `w-full cursor-pointer bg-slate-900/50 hover:bg-slate-900/70 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center p-12 transition-all duration-300 ${isDragging ? 'border-sky-400 scale-105' : ''}`;

    return (
        <div className="h-full flex flex-col items-center justify-center text-center min-h-screen">
            <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-400 pb-2">AGE-SIGHT</h1>
            <p className="mt-2 text-xl font-heading font-bold text-slate-300 tracking-widest">V 2.0</p>
            <div className="w-full max-w-2xl mx-auto mt-12">
                <label 
                    htmlFor="csv-upload" 
                    className={labelClasses}
                    onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                >
                    <svg className="w-16 h-16 text-slate-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
                    <span className="font-heading font-bold text-xl text-slate-300">Upload Ageing Data</span>
                    <span className="text-sm text-slate-400 mt-1">{fileName || 'Drag & drop or click to select a CSV file'}</span>
                </label>
                <input type="file" id="csv-upload" className="hidden" accept=".csv, text/csv" onChange={handleChange} />
            </div>
            <div className="mt-6 text-center h-12">
                {isLoading && <p className="mt-4 text-center p-3 rounded-md text-blue-200 bg-blue-900/40">Processing...</p>}
                {error && <p className="mt-4 text-center p-3 rounded-md text-red-200 bg-red-900/40">{error}</p>}
            </div>
            <div className="mt-12">
                <a href="https://rahulphari.github.io/age/" target="_blank" rel="noopener noreferrer" className="glow-button-v2 inline-block bg-gradient-to-r from-violet-600 to-sky-500 text-white font-bold py-4 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105">
                    <span className="font-heading">🚀 AGE-SIGHT: Mission Control</span>
                    <span className="text-xs font-normal block opacity-80 mt-1">Predictive Analysis & Report Generation</span>
                </a>
            </div>
        </div>
    );
};

const DashboardHeader: React.FC<{title: string; subtitle: string}> = ({title, subtitle}) => (
    <div className="relative text-center p-8 rounded-lg mb-8 border-b-2 border-sky-400/50">
        <h1 className="text-5xl font-bold font-heading">{title}</h1>
        <p className="mt-2 text-lg text-slate-400">{subtitle}</p>
        <a href={GOOGLE_SHEET_URL} target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 px-3 rounded-full transition-colors">
            <span>Open Sheet</span>
        </a>
    </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`card-v2 p-6 ${className}`}>
        {children}
    </div>
);

interface SummaryCardProps {
    title: string;
    value: number | string;
    onClick: () => void;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, onClick }) => (
    <div onClick={onClick} className="card-v2 text-center p-4 cursor-pointer">
        <p className="text-sm font-medium text-sky-400 font-heading tracking-wider">{title}</p>
        <p className="text-5xl font-bold text-white mt-2">{value}</p>
    </div>
);

interface BreakdownGridProps<T> {
    data: { [key: string]: number };
    onFilter: (key: keyof T, value: string) => void;
    filterKey: keyof T;
    accentColor: string;
    gridCols?: string;
}
const BreakdownGrid = <T,>({ data, onFilter, filterKey, accentColor, gridCols = "sm:grid-cols-3" }: BreakdownGridProps<T>) => (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
        {Object.entries(data).map(([item, count]) => (
            <div
                key={item}
                onClick={() => onFilter(filterKey, item)}
                className={`card-v2 text-center p-3 cursor-pointer hover:!border-${accentColor}-500`}
            >
                <p className={`text-sm font-medium text-${accentColor}-400`}>{String(item).replace(/_/g, '-').replace('gt', '> ')}</p>
                <p className={`text-2xl font-bold text-white mt-1`}>{count}</p>
            </div>
        ))}
    </div>
);

interface RightPaneSummaryProps<T> {
    title: string;
    data: ReadonlyArray<Record<string, any>>;
    dataKeys: { main: string; total: string; highlight: string };
    onFilter: (key: keyof T, value: string) => void;
    filterKey: keyof T;
    subtitle?: string;
}
const RightPaneSummary = <T,>({ title, data, dataKeys, onFilter, filterKey, subtitle }: RightPaneSummaryProps<T>) => (
    <Card className="flex flex-col">
        <h3 className="text-2xl font-bold text-slate-100 mb-1 font-heading">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mb-3">{subtitle}</p>}
        <div className="scrollable-pane pr-2 flex-grow" style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {data.length === 0 ? <p className="text-slate-400 p-4">No {title.toLowerCase()} data available.</p> : (
                <table className="data-table w-full text-sm">
                    <thead>
                        <tr>
                            <th className="p-2 text-left">{title}</th>
                            <th className="p-2 text-left">Total</th>
                            <th className="p-2 text-left">&gt;96h</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={index} onClick={() => onFilter(filterKey, String(row[dataKeys.main]))} className="cursor-pointer">
                                <td className="font-bold text-slate-200 p-2 border-b border-slate-800">{String(row[dataKeys.main])}</td>
                                <td className="p-2 border-b border-slate-800">{String(row[dataKeys.total])}</td>
                                <td className={`p-2 border-b border-slate-800 ${row[dataKeys.highlight] > 0 ? 'text-red-400 font-bold' : ''}`}>{String(row[dataKeys.highlight])}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </Card>
);

// --- DASHBOARD COMPONENTS (V2.0 STYLING) ---

type OnShowDetails<T> = (title: string, data: T[], headers: { key: keyof T | string; label: string }[], type: 'b2c' | 'b2b') => void;
type OnShowCopy<T> = (data: T[], headers: { key: keyof T | string; label: string }[], type: 'b2c' | 'b2b') => void;

interface B2CDashboardProps {
    data: B2CAnalysisResult;
    onSync: () => void;
    syncStatus: string;
    onShowDetails: OnShowDetails<B2CProcessedRow>;
    headers: { key: keyof B2CProcessedRow | string; label: string }[];
}
const B2CDashboard: React.FC<B2CDashboardProps> = ({ data, onSync, syncStatus, onShowDetails, headers }) => {

    const handleFilter = useCallback((key: keyof B2CProcessedRow, value: string) => {
        const filtered = data.detailedWBNs.filter(item => String(item[key]) === value);
        onShowDetails(`Shipments for ${key.replace(/_/g, ' ')}: ${value}`, filtered, headers, 'b2c');
    }, [data.detailedWBNs, onShowDetails, headers]);

    const clearFilter = useCallback(() => {
        onShowDetails('All Ageing Shipments', data.detailedWBNs, headers, 'b2c');
    }, [data.detailedWBNs, onShowDetails, headers]);
    
    return (
        <div className="space-y-8">
            <DashboardHeader title="B2C/Heavy Dashboard" subtitle={`${DEFAULT_FACILITY} Facility`} />
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-3xl font-bold text-slate-100 font-heading">Ageing Summary</h2>
                         <button onClick={onSync} disabled={syncStatus !== 'idle'} className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800/50 disabled:cursor-not-allowed text-white text-sm font-bold py-2 px-4 rounded-full transition-colors">
                           {syncStatus === 'idle' ? 'Sync with Sheet' : (syncStatus === 'syncing' ? 'Syncing...' : 'Sync Sent!')}
                        </button>
                    </div>
                    <div className="space-y-6">
                        <SummaryCard title="Total Ageing WBNs" value={data.summary.totalWBNs} onClick={clearFilter} />
                        <div>
                            <h4 className="text-sm font-bold uppercase text-slate-400 mb-2 tracking-wider">Ageing Breakdown</h4>
                            <BreakdownGrid data={data.summary.ageBreakdown} onFilter={handleFilter} filterKey="aging_bucket" accentColor="red" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold uppercase text-slate-400 mb-2 tracking-wider">Product Type</h4>
                            <BreakdownGrid data={data.summary.productBreakdown} onFilter={handleFilter} filterKey="producttype" accentColor="green" gridCols="sm:grid-cols-2" />
                        </div>
                         <div>
                            <h4 className="text-sm font-bold uppercase text-slate-400 mb-2 tracking-wider">Status</h4>
                            <BreakdownGrid data={data.summary.statusBreakdown} onFilter={handleFilter} filterKey="status" accentColor="yellow" />
                        </div>
                    </div>
                </Card>
                <div className="flex flex-col">
                    <RightPaneSummary
                        title="NDC Breakdown"
                        data={data.ndcSummary}
                        dataKeys={{ main: 'ndc', total: 'total_ageing_wbns', highlight: 'age_gt_96' }}
                        onFilter={handleFilter}
                        filterKey="ndc"
                    />
                </div>
            </div>
        </div>
    );
}

interface B2BDashboardProps {
    data: B2BAnalysisResult;
    onSync: () => void;
    syncStatus: string;
    onShowDetails: OnShowDetails<B2BProcessedRow>;
    headers: { key: keyof B2BProcessedRow | string; label: string }[];
}
const B2BDashboard: React.FC<B2BDashboardProps> = ({ data, onSync, syncStatus, onShowDetails, headers }) => {

    const handleFilter = useCallback((key: keyof B2BProcessedRow, value: string) => {
        const filtered = data.detailedWBNs.filter(item => String(item[key]) === value);
        onShowDetails(`Shipments for ${key.replace(/_/g, ' ')}: ${value}`, filtered, headers, 'b2b');
    }, [data.detailedWBNs, onShowDetails, headers]);

    const clearFilter = useCallback(() => {
        onShowDetails('All Pending Shipments', data.detailedWBNs, headers, 'b2b');
    }, [data.detailedWBNs, onShowDetails, headers]);

    const controllableGroups = useMemo(() => {
        return data.summary.controllableBreakdown.reduce((acc: Record<string, typeof data.summary.controllableBreakdown>, item) => {
            const key = item.controllable_remark;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {});
    }, [data.summary.controllableBreakdown]);
    
    return (
        <div className="space-y-8">
            <DashboardHeader title="B2B (To Connect) Dashboard" subtitle={`${DEFAULT_FACILITY} Facility`} />
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-3xl font-bold text-slate-100 font-heading">Pending WBNs Summary</h3>
                        <button onClick={onSync} disabled={syncStatus !== 'idle'} className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800/50 disabled:cursor-not-allowed text-white text-sm font-bold py-2 px-4 rounded-full transition-colors">
                           {syncStatus === 'idle' ? 'Sync with Sheet' : (syncStatus === 'syncing' ? 'Syncing...' : 'Sync Sent!')}
                        </button>
                    </div>
                    <div className="space-y-4">
                        <SummaryCard title="Total Pending WBNs" value={data.summary.totalWBNs} onClick={clearFilter} />
                        <div>
                            <h4 className="text-sm font-bold uppercase text-slate-400 mb-2 tracking-wider">Controllable Breakdown</h4>
                             {Object.entries(controllableGroups).map(([remark, items]) => (
                                <div key={remark} className="card-v2 p-3 mb-2 !border-slate-700">
                                    <div onClick={() => handleFilter('controllable_remark', remark)} className="flex justify-between items-center cursor-pointer p-2">
                                        <span className="font-bold text-slate-200">{remark}</span>
                                        <span className="font-bold text-2xl text-sky-400">{items.reduce((sum, i) => sum + i.count, 0)}</span>
                                    </div>
                                    <div className="pl-4 mt-2 space-y-1">
                                        {items.map(item => (
                                            <div key={item.sub_remark} onClick={() => handleFilter('sub_remark', item.sub_remark)} className="flex justify-between items-center text-sm cursor-pointer p-2 rounded-md hover:bg-white/5">
                                                <span className="text-slate-300">{item.sub_remark}</span>
                                                <span className="text-slate-100 font-medium">{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold uppercase text-slate-400 mb-2 tracking-wider">Ageing Breakdown</h4>
                            <BreakdownGrid data={data.summary.ageingBreakdown} onFilter={handleFilter} filterKey="ageing_bucket_hrs" accentColor="red" gridCols="sm:grid-cols-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold uppercase text-slate-400 mb-2 tracking-wider">Put Remark Breakdown</h4>
                            <BreakdownGrid data={data.summary.putBreakdown} onFilter={handleFilter} filterKey="put_remarks" accentColor="yellow" />
                        </div>
                    </div>
                </Card>
                <div className="space-y-8">
                    <RightPaneSummary title="NTC Breakdown" subtitle="(Controllable Ageing Only)" data={data.ntcSummary} dataKeys={{ main: 'ntc', total: 'total_wbns', highlight: 'age_gt_96' }} onFilter={handleFilter} filterKey="ntc" />
                    <RightPaneSummary title="Client Breakdown" subtitle="(Controllable Ageing Only)" data={data.clientSummary} dataKeys={{ main: 'client', total: 'total_wbns', highlight: 'age_gt_96' }} onFilter={handleFilter} filterKey="client" />
                </div>
            </div>
        </div>
    );
};

// --- MODAL COMPONENTS (V2.0 STYLING) ---

interface DetailsModalProps<T extends { wbn: string }> {
    title: string;
    data: T[];
    headers: { key: keyof T | string; label: string }[];
    type: 'b2c' | 'b2b';
    onClose: () => void;
    renderRow: (item: T) => React.ReactNode;
    onShowCopy: OnShowCopy<T>;
}
const DetailsModal = <T extends { wbn: string },>({ title, data, headers, type, onClose, renderRow, onShowCopy }: DetailsModalProps<T>) => {
    const defaultSortKey = type === 'b2c' ? 'sd_dif' : 'ageing_days';
    const [sortConfig, setSortConfig] = useState<SortConfig<T>>({ key: defaultSortKey as keyof T, order: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');

    const handleSort = useCallback((key: keyof T) => {
        setSortConfig(prev => ({ key, order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc' }));
    }, []);

    const filteredAndSortedData = useMemo(() => {
        let items = [...data];
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            items = items.filter(item => 
                Object.values(item).some(val => 
                    String(val).toLowerCase().includes(lowercasedTerm)
                )
            );
        }

        return items.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.order === 'asc' ? valA - valB : valB - valA;
            }
            return sortConfig.order === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
        });
    }, [data, searchTerm, sortConfig]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 transition-opacity">
            <div className="card-v2 p-6 w-full max-w-7xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700 gap-4 flex-wrap">
                    <h3 className="text-3xl font-bold text-white font-heading">{title} ( {filteredAndSortedData.length} WBNs )</h3>
                    <div className="flex items-center gap-2">
                         <input 
                            type="text" 
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); }}
                            className="w-64 bg-slate-900/80 border border-slate-700 rounded-md py-2 px-3 text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none" 
                            placeholder="Magic Filter..."
                        />
                        <button onClick={() => onShowCopy(filteredAndSortedData, headers, type)} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-full transition-colors">Copy Data</button>
                        <button onClick={onClose} className="text-4xl font-light text-slate-400 hover:text-white leading-none">&times;</button>
                    </div>
                </div>
                <div className="overflow-y-auto scrollable-pane">
                    <table className="data-table w-full">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                {headers.map(header => (
                                    <th
                                        key={String(header.key)}
                                        onClick={() => handleSort(header.key as keyof T)}
                                        className={`p-3 text-left cursor-pointer ${sortConfig.key === header.key ? (sortConfig.order === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                                    >
                                        {header.label} <span className="sort-icon">▲</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedData.map(item => renderRow(item))}
                        </tbody>
                    </table>
                     {filteredAndSortedData.length === 0 && <p className="text-slate-400 p-4 text-center">No data available for this selection.</p>}
                </div>
            </div>
        </div>
    );
};

interface CopyModalProps<T> {
    data: T[];
    headers: { key: keyof T | string; label: string }[];
    type: 'b2c' | 'b2b';
    onClose: () => void;
}

const CopyModal = <T extends B2CProcessedRow | B2BProcessedRow>({ data, headers, type, onClose }: CopyModalProps<T>) => {
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(headers.map(h => String(h.key))));
    const [b2bFilter, setB2bFilter] = useState('Both');
    const [copyStatus, setCopyStatus] = useState('Copy Selected Data');

    const handleColumnToggle = (key: string) => {
        setSelectedColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            return newSet;
        });
    };

    const handleCopy = () => {
        let rowsToCopy = data;
        if (type === 'b2b') {
            if (b2bFilter !== 'Both') {
                rowsToCopy = (rowsToCopy as B2BProcessedRow[]).filter(row => row.controllable_remark === b2bFilter) as T[];
            }
        }

        const activeHeaders = headers.filter(h => selectedColumns.has(String(h.key)));
        const headerString = activeHeaders.map(h => h.label).join('\t');
        
        const dataString = rowsToCopy.map(row => {
            return activeHeaders.map(h => row[h.key as keyof T]).join('\t');
        }).join('\n');

        navigator.clipboard.writeText(`${headerString}\n${dataString}`).then(() => {
            setCopyStatus('Copied!');
            setTimeout(() => onClose(), 1500);
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
            <div className="card-v2 p-6 w-full max-w-2xl">
                <h3 className="text-2xl font-bold mb-4 text-white font-heading">Customize Data to Copy</h3>
                {type === 'b2b' && (
                    <div className="mb-4">
                        <p className="text-sm font-medium text-slate-300 mb-2">Filter by Remark:</p>
                        <div className="flex space-x-2 rounded-lg bg-slate-900 p-1">
                            {['Controllable', 'Non-Controllable', 'Both'].map(filter => (
                                <button key={filter} onClick={() => setB2bFilter(filter)} className={`copy-filter-btn flex-1 ${b2bFilter === filter ? 'active' : ''}`}>{filter}</button>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <p className="text-sm font-medium text-slate-300 mb-2">Select Columns to Copy:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900 rounded-md border border-slate-700">
                        {headers.map(h => (
                            <label key={String(h.key)} className="flex items-center space-x-2 text-slate-300 cursor-pointer p-1 rounded hover:bg-white/5">
                                <input type="checkbox" checked={selectedColumns.has(String(h.key))} onChange={() => handleColumnToggle(String(h.key))} className="form-checkbox bg-slate-700 border-slate-500 rounded text-sky-500 focus:ring-sky-500" />
                                <span>{h.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-600 text-slate-100 font-semibold rounded-lg hover:bg-slate-500">Cancel</button>
                    <button onClick={handleCopy} className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700">{copyStatus}</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

export default function App() {
    const [view, setView] = useState<'upload' | 'b2c' | 'b2b'>('upload');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [fileTimestamp, setFileTimestamp] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
    
    const [detailsModalData, setDetailsModalData] = useState<{ title: string; data: any[]; headers: any[]; type: 'b2c' | 'b2b' } | null>(null);
    const [copyModalData, setCopyModalData] = useState<{ data: any[]; headers: any[]; type: 'b2c' | 'b2b' } | null>(null);

    const b2cHeaders = useMemo(() => [
        { key: 'wbn', label: 'WBN' },
        { key: 'sd_dif', label: 'Ageing (hrs)' },
        { key: 'ndc', label: 'NDC' },
        { key: 'status', label: 'Status' },
    ], []);

    const b2bHeaders = useMemo(() => [
        { key: 'wbn', label: 'WBN' },
        { key: 'ntc', label: 'NTC' },
        { key: 'client', label: 'Client'},
        { key: 'ageing_days', label: 'Ageing (Days)' },
        { key: 'remark_combined', label: 'Remark' },
        { key: 'cs_sr', label: 'CS SR' },
    ], []);

    const handleFileSelect = useCallback((file: File) => {
        setIsLoading(true); setError(null); setFileTimestamp(file.lastModified);
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = processCsvData(event.target?.result as string);
            if (result.type === 'error') {
                setError(result.message); setView('upload');
            } else {
                setAnalysisResult(result.data); setView(result.type);
            }
            setIsLoading(false);
        };
        reader.onerror = () => { setError("Error reading file."); setIsLoading(false); };
        reader.readAsText(file);
    }, []);

    const handleSync = useCallback(async () => {
        if (!analysisResult || !fileTimestamp) return;
        setSyncStatus('syncing');
        
        const type = 'ndcSummary' in analysisResult ? 'b2c' : 'b2b';
        const dataToSync = analysisResult.detailedWBNs;
        
        const result = await syncWithGoogleSheet(type, dataToSync, fileTimestamp);
        if(result.success) {
            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } else {
            setError(result.error || 'Sync failed.'); setSyncStatus('idle');
        }
    }, [analysisResult, fileTimestamp]);

    const handleShowDetails = useCallback((title, data, headers, type) => { setDetailsModalData({ title, data, headers, type }); }, []);
    const handleShowCopy = useCallback((data, headers, type) => { setCopyModalData({ data, headers, type }); }, []);

    const renderB2CRow = useCallback((item: B2CProcessedRow) => (
        <tr key={item.wbn}>
             <td className="p-2 border-b border-slate-800">
                <a href={`${WBN_BASE_URL}${item.wbn}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{item.wbn}</a>
                {item.producttype === 'Heavy' && <span className="shipment-indicator indicator-h">H</span>}
                {item.large && <span className="shipment-indicator indicator-l">L</span>}
            </td>
            <td className="p-2 border-b border-slate-800">{item.sd_dif.toFixed(2)}</td>
            <td className="p-2 border-b border-slate-800">{item.ndc}</td>
            <td className="p-2 border-b border-slate-800">{item.status}</td>
        </tr>
    ), []);

    const renderB2BRow = useCallback((item: B2BProcessedRow) => (
         <tr key={item.wbn}>
            <td className="p-2 border-b border-slate-800"><a href={`${WBN_BASE_URL}${item.wbn}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{item.wbn}</a></td>
            <td className="p-2 border-b border-slate-800">{item.ntc}</td>
            <td className="p-2 border-b border-slate-800">{item.client}</td>
            <td className="p-2 border-b border-slate-800">{item.ageing_days.toFixed(0)}</td>
            <td className="p-2 border-b border-slate-800">{item.remark_combined}</td>
            <td className="p-2 border-b border-slate-800">{item.cs_sr}</td>
        </tr>
    ), []);

    const renderContent = () => {
        switch (view) {
            case 'b2c': return <B2CDashboard data={analysisResult as B2CAnalysisResult} onSync={handleSync} syncStatus={syncStatus} onShowDetails={handleShowDetails} headers={b2cHeaders} />;
            case 'b2b': return <B2BDashboard data={analysisResult as B2BAnalysisResult} onSync={handleSync} syncStatus={syncStatus} onShowDetails={handleShowDetails} headers={b2bHeaders} />;
            default: return <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} error={error} />;
        }
    };

    return (
        <>
            <main className="mx-auto p-4 md:p-8">
                {renderContent()}
            </main>
            {detailsModalData && (
                <DetailsModal 
                    {...detailsModalData}
                    onClose={() => setDetailsModalData(null)}
                    renderRow={detailsModalData.type === 'b2c' ? renderB2CRow : renderB2BRow}
                    onShowCopy={handleShowCopy}
                />
            )}
            {copyModalData && (
                <CopyModal
                    {...copyModalData}
                    onClose={() => setCopyModalData(null)}
                />
            )}
        </>
    );
}
