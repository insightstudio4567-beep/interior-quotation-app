/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Calculator, 
  FileText, 
  Image as ImageIcon, 
  Send, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Building2,
  History,
  Download,
  Upload,
  Trash2,
  Database,
  ArrowUp,
  ArrowDown,
  List,
  Search,
  ChevronRight,
  Pencil,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

// Types
interface QuotationHistory {
  id: string;
  timestamp: string;
  input: string;
  output: string;
  chartData?: any[];
}

interface PriceItem {
  category: string;
  name: string;
  spec: string;
  unit: string;
  price: string;
}

interface SmartPackage {
  label: string;
  text: string;
}

const DEFAULT_PACKAGES: SmartPackage[] = [
  { label: '浴室翻新', text: '浴室磁磚更新（含拆除、防水、貼磚、衛浴安裝）' },
  { label: '全室油漆', text: '全室油漆粉刷（含批土、打磨、兩度面漆）' },
  { label: '木地板鋪設', text: '全室鋪設 SPC 木地板（含地面保護、找平）' },
  { label: '水電更新', text: '全室水電管線更新（含配電箱、迴路、插座開關）' }
];

const PRICE_DATABASE: PriceItem[] = [
  { category: '保護工程', name: '地面保護', spec: '雙層保護 (PE板+防潮布)', unit: '坪', price: '450-600' },
  { category: '保護工程', name: '電梯保護', spec: '公共區域全方位保護', unit: '式', price: '3,500-5,000' },
  { category: '拆除工程', name: '磚牆拆除', spec: '4吋磚牆 (含清運)', unit: '坪', price: '2,500-3,500' },
  { category: '拆除工程', name: '天花板拆除', spec: '木作/輕鋼架天花板', unit: '坪', price: '800-1,200' },
  { category: '泥作工程', name: '地面找平', spec: '水泥砂漿找平 (3cm內)', unit: '坪', price: '2,200-2,800' },
  { category: '泥作工程', name: '紅磚牆砌築', spec: '1/2B 磚牆', unit: '坪', price: '6,500-8,000' },
  { category: '水電工程', name: '新增插座', spec: '含配管配線 (單相)', unit: '組', price: '1,200-1,800' },
  { category: '水電工程', name: '冷熱水管遷移', spec: '不鏽鋼壓接管', unit: '式', price: '8,000-12,000' },
  { category: '木作工程', name: '平頂天花板', spec: '矽酸鈣板 (日本麗仕)', unit: '坪', price: '3,200-4,200' },
  { category: '木作工程', name: '造型電視牆', spec: '木作結構+皮板/石材', unit: '尺', price: '4,500-8,500' },
  { category: '油漆工程', name: '乳膠漆', spec: '一底二度 (ICI/得利)', unit: '坪', price: '1,200-1,800' },
  { category: '系統櫃', name: '衣櫃', spec: 'E1級 V313 板材', unit: '尺', price: '4,500-6,500' },
  { category: '地板工程', name: 'SPC 石塑地板', spec: '含防潮墊與收邊', unit: '坪', price: '2,800-4,200' },
  { category: '清潔工程', name: '粗清', spec: '大型廢棄物清運', unit: '式', price: '5,000-8,000' },
  { category: '清潔工程', name: '細清', spec: '全室入住級清潔', unit: '坪', price: '600-1,000' },
];

export default function App() {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QuotationHistory[]>([]);
  const [priceSearch, setPriceSearch] = useState('');
  const [prices, setPrices] = useState<PriceItem[]>(() => {
    const saved = localStorage.getItem('price_database');
    return saved ? JSON.parse(saved) : PRICE_DATABASE;
  });
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [newPrice, setNewPrice] = useState<PriceItem>({
    category: '',
    name: '',
    spec: '',
    unit: '',
    price: ''
  });
  const [packages, setPackages] = useState<SmartPackage[]>(() => {
    const saved = localStorage.getItem('smart_packages');
    return saved ? JSON.parse(saved) : DEFAULT_PACKAGES;
  });
  const [showManagePackages, setShowManagePackages] = useState(false);
  const [newPackage, setNewPackage] = useState<SmartPackage>({ label: '', text: '' });
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const filteredPrices = prices.filter(item => 
    item.name.includes(priceSearch) || 
    item.category.includes(priceSearch) ||
    item.spec.includes(priceSearch)
  );

  const [editingPriceItem, setEditingPriceItem] = useState<PriceItem | null>(null);

  const handleAddPrice = () => {
    if (!newPrice.category || !newPrice.name || !newPrice.price) return;
    
    let updated;
    if (editingPriceItem) {
      updated = prices.map(p => p === editingPriceItem ? newPrice : p);
      setEditingPriceItem(null);
    } else {
      updated = [newPrice, ...prices];
    }

    setPrices(updated);
    localStorage.setItem('price_database', JSON.stringify(updated));
    setNewPrice({ category: '', name: '', spec: '', unit: '', price: '' });
    setShowAddPrice(false);
  };

  const handleEditPrice = (item: PriceItem) => {
    setNewPrice(item);
    setEditingPriceItem(item);
    setShowAddPrice(true);
  };

  const handleDeletePrice = (index: number) => {
    const updated = prices.filter((_, i) => i !== index);
    setPrices(updated);
    localStorage.setItem('price_database', JSON.stringify(updated));
  };

  const [selectedPackageItems, setSelectedPackageItems] = useState<Set<string>>(new Set());
  const [editingPackageIndex, setEditingPackageIndex] = useState<number | null>(null);

  const togglePackageItem = (item: PriceItem) => {
    const key = `${item.category}-${item.name}-${item.spec}`;
    const newSet = new Set(selectedPackageItems);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedPackageItems(newSet);
  };

  const handleAddPackage = () => {
    if (!newPackage.label || selectedPackageItems.size === 0) return;
    
    const selectedItemsList = prices.filter(p => selectedPackageItems.has(`${p.category}-${p.name}-${p.spec}`));
    const text = selectedItemsList.map(p => `- ${p.category} ${p.name} (${p.spec})`).join('\n');
    const packageData = { label: newPackage.label, text: `包含以下工項：\n${text}` };
    
    let updated;
    if (editingPackageIndex !== null) {
      updated = [...packages];
      updated[editingPackageIndex] = packageData;
      setEditingPackageIndex(null);
    } else {
      updated = [...packages, packageData];
    }

    setPackages(updated);
    localStorage.setItem('smart_packages', JSON.stringify(updated));
    setNewPackage({ label: '', text: '' });
    setSelectedPackageItems(new Set());
  };

  const handleEditPackage = (index: number) => {
    const pkg = packages[index];
    setNewPackage({ label: pkg.label, text: '' });
    setEditingPackageIndex(index);
    
    // Parse selected items from text
    const newSet = new Set<string>();
    const lines = pkg.text.split('\n');
    
    // Iterate through all prices to find matches in the text
    prices.forEach(p => {
      const itemString = `- ${p.category} ${p.name} (${p.spec})`;
      // Check if any line in the package text contains this item string
      // We use includes because there might be slight variations or extra spaces
      if (lines.some(line => line.includes(itemString))) {
        newSet.add(`${p.category}-${p.name}-${p.spec}`);
      }
    });
    
    setSelectedPackageItems(newSet);
  };

  const handleCancelEdit = () => {
    setNewPackage({ label: '', text: '' });
    setEditingPackageIndex(null);
    setSelectedPackageItems(new Set());
  };

  const handleDeletePackage = (index: number) => {
    const updated = packages.filter((_, i) => i !== index);
    setPackages(updated);
    localStorage.setItem('smart_packages', JSON.stringify(updated));
  };

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('category_order');
    return saved ? JSON.parse(saved) : [];
  });

  // Group prices by category
  const groupedPrices = React.useMemo(() => {
    const filtered = prices.filter(p => 
      p.name.includes(priceSearch) || 
      p.category.includes(priceSearch) || 
      p.spec.includes(priceSearch)
    );
    
    const groups: { [key: string]: PriceItem[] } = {};
    filtered.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [prices, priceSearch]);

  const sortedCategories = React.useMemo(() => {
    return Object.keys(groupedPrices).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [groupedPrices, categoryOrder]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const moveCategory = (category: string, direction: 'up' | 'down') => {
    setCategoryOrder(prev => {
      const currentOrder = [...prev];
      // Ensure all current categories are in the list
      Object.keys(groupedPrices).forEach(c => {
        if (!currentOrder.includes(c)) currentOrder.push(c);
      });
      
      const index = currentOrder.indexOf(category);
      if (index === -1) return prev;
      
      if (direction === 'up' && index > 0) {
        [currentOrder[index], currentOrder[index - 1]] = [currentOrder[index - 1], currentOrder[index]];
      } else if (direction === 'down' && index < currentOrder.length - 1) {
        [currentOrder[index], currentOrder[index + 1]] = [currentOrder[index + 1], currentOrder[index]];
      }
      
      localStorage.setItem('category_order', JSON.stringify(currentOrder));
      return currentOrder;
    });
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const newItems: PriceItem[] = [];

      // Skip header if present (simple check)
      const startIndex = lines[0].includes('類別') || lines[0].includes('Category') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parser handling quotes
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim().replace(/^"|"$/g, ''));

        if (parts.length >= 5) {
          newItems.push({
            category: parts[0] || '',
            name: parts[1] || '',
            spec: parts[2] || '',
            unit: parts[3] || '',
            price: parts[4] || ''
          });
        }
      }

      if (newItems.length > 0) {
        const updated = [...prices, ...newItems];
        setPrices(updated);
        localStorage.setItem('price_database', JSON.stringify(updated));
        alert(`成功匯入 ${newItems.length} 筆資料`);
      } else {
        alert('無法讀取資料，請確認 CSV 格式是否正確 (類別,名稱,規格,單位,單價)');
      }
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateQuotation = async () => {
    if (!input && images.length === 0) {
      setError('請輸入需求說明或上傳圖面資訊。');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const priceList = prices.map(p => `- ${p.category} ${p.name} (${p.spec}): ${Number(p.price).toLocaleString()} / ${p.unit}`).join('\n');

      const prompt = `
        你是一位擁有 15 年經驗的資深室內設計估價師，現正任職於「琢見空間整合有限公司」。你的專長是精準拆解室內設計圖面與客戶需求，將其轉換為詳細、無遺漏的工程報價單。

        【核心任務】
        分析以下提供的需求說明及圖面，列出所有必要的工程項目，並進行初步的數量與預算估算。請嚴格仿照「忠誠路工程明細表」的邏輯與格式進行編列。

        【參考單價資料庫 (最高優先級)】
        這是使用者自定義的常用單價表。在估算時，請**絕對優先**搜尋並使用此列表中的項目名稱與單價。
        1. 若需求項目與此資料庫中的項目名稱或規格相符（或高度相關），**必須**直接採用此資料庫的名稱與單價。
        2. **嚴格禁止**自行添加資料庫中未提及的備註、工法說明或規格描述。請直接使用資料庫中的「名稱」與「規格」欄位內容。
        3. 只有當此資料庫中找不到對應項目時，才使用下方的「標準工程項目字典」或你的專業知識進行估算。
        
        資料庫內容：
        ${priceList}

        【作業規範與 SOP】
        1. 絕不憑空捏造：無法明確判斷時，請在備註提出疑問。
        2. **資料庫項目一致性與欄位分配**：
           - 「工程項目」欄位：填寫資料庫中的「名稱」。
           - 「工程明細」與「備註」欄位：請將資料庫中的「規格」內容進行拆分。若「規格」內容中包含括弧（例如「雙層保護 (PE板+防潮布)」），請將括弧內的文字（不含括弧）填入「備註」欄位，括弧外的文字填入「工程明細」欄位。若無括弧，則全數填入「工程明細」。
           - 「單位」欄位：必須完全依照資料庫中的「單位」填寫（例如：坪、式、組、尺），不可自行轉換（例如將「坪」改為「m²」）。
        3. 工程項目分類：請嚴格依照以下主分類進行歸納：假設工程、拆除工程（含廢棄物清運）、泥作工程、水電工程、天花工程、地坪工程、隔間工程、門窗工程、木工工程、塗裝工程、清潔工程（僅限細清）、廚具工程、櫃體工程、磁磚工程、石材工程、玻璃工程、衛生設備、空調設備、燈具設備、軟裝家具。
           * 特別注意：「廢棄物清運車資」、「拆除搬運工資」請務必歸類於【拆除工程】。
        3. 空間分類（獨立列示原則）：請務必將工程項目依照「空間」進行次分類。**絕對不可將不同空間的相同工程合併計算**。例如：主浴與客浴都有「磁磚地坪拆除見底」，必須分開列為兩行（一行空間為主浴，一行空間為客浴），即使項目名稱完全一樣也要分開標示，以利客戶日後針對單一空間進行預算增減。
        4. 牆地分離原則：針對拆除、泥作、磁磚、防水等工程，**必須明確區分「牆面」與「地坪」**。因為兩者材質、工法與單價可能不同，不可合併為「全室」或「浴室」一項。例如：「浴室磁磚拆除」應拆分為「浴室牆面磁磚拆除」與「浴室地坪磁磚拆除」。
        5. 隱藏成本：考量耗損率（如磁磚、木地板預設加計 10%）及收邊五金。
        6. 品牌與材質：未指定時以「中等價位常規建材」預估，並標示「待確認品牌」。

        【標準工程項目字典 (忠誠路範本)】
        請嚴格使用以下標準項目名稱進行報價，若遇特殊項目請參照此命名邏輯（標示品牌、工法、規格）：
        - 假設工程：玄關大門保護、地坪施工毯+夾板保護、木地板完成後施工毯保護、工程期間粉塵過濾器租借及耗材、吊車車資、廢棄物裝袋+搬運工資、廢棄物清運車資、材料搬運工資、材料裝袋補貼、外牆蜘蛛人高空吊索作業/拆管/補縫/局部防水。
        - 拆除工程：落地鋁窗拆除、木作門組拆除、牆面拆除見底、磁磚地坪拆除見底、木作平釘單層天花拆除、門組拆除、地坪磁磚剔除、衛生設備拆除、紅磚浴缸側牆拆除、廚房設備拆除、廚房櫃體拆除。
        - 泥作工程：落地窗/鋁窗/鋁合金通風門水泥砂漿填縫+抹直角、地坪基礎防水、牆面壁癌防水、地面水泥砂漿整平(+粉光/抓洩水)、牆面水泥砂漿整平(+粉光)、牆面/地坪二次防水、地面木紋磁磚貼工、牆地30x60磁磚貼工、地面30x30磁磚貼工。
        - 水電工程：更換幹線22MM平方XLPE、施工期間臨時水電配置、台電申請報竣工封籤、更換匯流排開關箱、新增資訊箱、動力電裝配工資、表後開關75A 10K、士林電機斷路器(NFB)/漏電斷路器、(IH爐/電熱水器/空調/暖風機)專用迴路、新增110V燈具插座迴路、冷水幹管更新/錶後入戶、加壓馬達安裝、管槽打鑿工資、基礎燈具/間接照明安裝工資、開關插座面板安裝工資、插座/電燈/開關/網路/電視/電鈴出口、對講機移位、1吋預留空管/預埋盒、國際牌星光/開關插座面板、冷氣排水配管、冷水/熱水出口、糞管/排水修改、排風管洗孔、暖風機排氣配管/安裝工資、衛生設備/配件安裝工資、廚房油煙機排氣配管。
        - 天花工程：木作空調封板、木作間接照明、木作窗簾盒、木作矽酸鈣平頂天花、下掀無框維修孔、木作PVC厚板平頂天花。
        - 地坪工程：海島型木地板長版拼、分隔條。
        - 隔間工程：木作隔間、電箱/資訊箱暗門。
        - 門窗工程：(正新)隔音氣密落地窗/氣密窗、鋁合金三合一通風門。
        - 木工工程：(科定)木作系統門組。
        - 塗裝工程：(得利ICI)平頂天花/牆面批土刷乳膠漆、(得利ICI)戶外晴雨漆。
        - 廚具工程：系統收納吊櫃/矮櫃、鋁合金抽屜五金。
        - 櫃體工程：木作電器收納矮櫃/衣物收納高櫃、抽屜+五金。
        - 磁磚工程：地面木紋磚、牆面/地面30x60磁磚、地面30x30磁磚。
        - 石材工程：人造石檯面、水槽/爐台檯面開孔及下嵌工資、大理石(浴室)門檻。
        - 玻璃工程：五角形無框淋浴外開門。
        - 衛生設備：TOTO分離式馬桶/溫水洗淨便座、洗地器、凱撒臉盆浴櫃組/單門鏡櫃/臉盆龍頭/淋浴控溫龍頭/滑桿、國際牌暖風機遙控220V、地面/洗衣機排水孔蓋、(櫻花)電熱水器。
        - 空調設備：日立變頻冷暖壁掛(RAS/RAC系列)、日本銅管2/3、排水施工、安裝架、安裝工資。
        - 燈具設備：LED 30W/60W 吸頂燈、間接照明LED燈條/24V/4000K、LED燈條24V安定器、9.5cm-LED崁燈12W、檯面照明LED鋁擠型燈條。

        【數量估算標準 (忠誠路明細表邏輯)】
        1. 單位轉換：1 坪 ≈ 3.3 米平方 (m²)。報價單中面積單位請盡量以「米平方」或「坪」表示，長度以「cm」或「米」表示。
        2. 泥作工程：
           - 磁磚/地板耗損：預設加計 10-15%。
           - 牆面面積估算：若無立面圖，以「地坪 x 3.6」作為粗估牆面總面積（扣除門窗）。
           - 浴室防水：高度預設至樑下或 210cm。
        3. 水電工程：
           - 迴路估算：廚房專用迴路預設 2-3 組，全室插座依空間功能配置。
           - 燈具配置：若無圖面，以每坪 1.5 盞崁燈估算亮度。
        4. 木工/天花工程：
           - 天花板面積通常等於該空間地坪面積。
           - 窗簾盒、間接照明以該空間周長或特定牆面長度估算 (cm)。
        5. 塗裝工程：
           - 牆面與天花板粉刷面積約為地坪面積的 3~4 倍。

        【工程關聯性與完整性 (Dependencies)】
        當客戶提到「表面工程」時，請自動關聯並補足必要的「基礎工程」：
        1. 浴室翻新鏈：若提到「貼磁磚」，必須包含「拆除舊有磁磚」、「地壁面整平」、「三道防水施工」、「試水測試」。
        2. 衛浴設備鏈：若提到「安裝衛浴」，必須包含「水電管路遷移/定位」、「廢棄物清運」。
        3. 地板工程鏈與保護邏輯：
           - 若進場時「原始地板保留沿用」，則必須編列「室內地面保護」。
           - 若室內地板「要從磁磚換成木地板，或是磁磚要更新，需要全面打除」，則既有的地板不需要保護（請勿編列室內地面保護，但仍需考量公共梯間/電梯保護）。
           - 鋪設木地板前需評估是否需要「地面找平（若地況不佳）」。
        4. 牆面工程鏈：若提到「油漆」，必須包含「批土整平」、「打磨」。

        【輸出格式】
        請一律使用 Markdown 格式輸出，並分為四個部分：
        1. 【空間面積總表】：根據圖面或需求說明，分別列出各空間的「地坪」與「牆面」面積。
           * 牆面面積若無明確資訊，請以「地坪面積 * 3.5」粗估並於備註說明。
           | 空間名稱 | 地坪 (坪) | 地坪 (m²) | 牆面 (坪) | 牆面 (m²) | 備註 |
        2. 【工程預算總表】：彙整各大項工程的小計與佔比。
           | 工程項目 | 小計金額 | 佔總預算百分比 |
        3. 【報價明細表】：詳細列出各空間的工程項目，表格必須包含以下欄位：
           | 項次 | 工程項目 | 空間 | 工程明細 | 數量 | 單位 | 單價 | 總價 | 備註 |
           * 項次：請依序編號 (1, 2, 3...)，方便後續參照修改。
           * 注意：請在每個「工程項目」分類的最後一行，加入該項目的小計列。例如：
           | | **泥作工程 小計** | | | | | | **150000** | **佔比 15%** |
        4. 【總計】：列出未稅總計、稅金(5%)、含稅總計。
        5. 【圖表資料】：請在最後輸出一段 JSON 格式的資料，用於繪製圓餅圖。格式必須如下，請確保為合法的 JSON 格式，並用 \`\`\`json 包起來：
        \`\`\`json
        {
          "chartData": [
            { "name": "泥作工程", "value": 150000 },
            { "name": "水電工程", "value": 80000 }
          ]
        }
        \`\`\`

        【計算規則】
        1. 金額格式：單價與總價請務必加入千分位符號（例如 3,500），但不需加入 $ 符號。
        2. 總價：數量 * 單價。請確保數值計算正確（四捨五入至整數）。
        3. 百分比計算：各項工程小計 / 未稅總預算 * 100%，算至小數點第一位。

        需求說明：
        ${input}
      `;

      const parts = [{ text: prompt }];
      
      images.forEach(img => {
        const base64Data = img.split(',')[1];
        const mimeType = img.split(';')[0].split(':')[1];
        parts.push({
          // @ts-ignore - inlineData is valid for generateContent
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: parts as any },
      });

      const text = response.text || "無法生成報價，請檢查輸入資訊。";
      
      let textOutput = text;
      let parsedChartData = null;

      // Extract JSON block
      const jsonMatch = textOutput.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.chartData) {
            parsedChartData = parsed.chartData;
          }
        } catch (e) {
          console.error("Failed to parse chart data JSON", e);
        }
        // Remove the JSON block from the markdown output
        textOutput = textOutput.replace(/```json\n[\s\S]*?\n```/, '').replace(/5\. 【圖表資料】：[\s\S]*$/, '').trim();
      }

      setResult(textOutput);
      setChartData(parsedChartData);
      
      // Add to history
      const newEntry: QuotationHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('zh-TW'),
        input: input.substring(0, 50) + (input.length > 50 ? '...' : ''),
        output: textOutput,
        chartData: parsedChartData || undefined
      };
      setHistory(prev => [newEntry, ...prev]);

    } catch (err: any) {
      console.error(err);
      setError('生成報價時發生錯誤，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refineInput.trim() || !result) return;

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const priceList = prices.map(p => `- ${p.category} ${p.name} (${p.spec}): ${Number(p.price).toLocaleString()} / ${p.unit}`).join('\n');

      const prompt = `
        你是一位擁有 15 年經驗的資深室內設計估價師。
        
        【任務目標】
        請根據以下的使用者修改需求，更新原本的工程報價單。
        
        【原始需求】
        ${input}

        【目前的報價單內容】
        ${result}

        【使用者的修改指示】
        ${refineInput}

        【參考單價資料庫】
        ${priceList}

        【輸出規則】
        請重新輸出完整的報價單，包含空間面積總表、工程預算總表、報價明細表、總計、JSON圖表資料。
        
        特別注意：
        1. 報價明細表請務必包含「項次」欄位，格式如下：
        | 項次 | 工程項目 | 空間 | 工程明細 | 數量 | 單位 | 單價 | 總價 | 備註 |
        2. **資料庫項目一致性與欄位分配**：
           - 「工程項目」欄位：填寫資料庫中的「名稱」。
           - 「工程明細」與「備註」欄位：請將資料庫中的「規格」內容進行拆分。若「規格」內容中包含括弧（例如「雙層保護 (PE板+防潮布)」），請將括弧內的文字（不含括弧）填入「備註」欄位，括弧外的文字填入「工程明細」欄位。若無括弧，則全數填入「工程明細」。
           - 「單位」欄位：必須完全依照資料庫中的「單位」填寫（例如：坪、式、組、尺），不可自行轉換（例如將「坪」改為「m²」）。
        
        請只針對修改指示進行調整，其他未提及的部分請保持原樣（除非因修改而需要連動調整，例如總價變動）。
        
        請確保輸出包含 JSON 圖表資料區塊，格式如下：
        \`\`\`json
        {
          "chartData": [
            { "name": "泥作工程", "value": 150000 },
            { "name": "水電工程", "value": 80000 }
          ]
        }
        \`\`\`
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "無法生成報價，請檢查輸入資訊。";
      
      let textOutput = text;
      let parsedChartData = null;

      // Extract JSON block
      const jsonMatch = textOutput.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.chartData) {
            parsedChartData = parsed.chartData;
          }
        } catch (e) {
          console.error("Failed to parse chart data JSON", e);
        }
        // Remove the JSON block from the markdown output
        textOutput = textOutput.replace(/```json\n[\s\S]*?\n```/, '').replace(/5\. 【圖表資料】：[\s\S]*$/, '').trim();
      }

      setResult(textOutput);
      setChartData(parsedChartData);
      
      // Add to history
      const newEntry: QuotationHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        input: `[修改] ${refineInput}`,
        output: textOutput,
        chartData: parsedChartData || undefined
      };
      setHistory(prev => [newEntry, ...prev]);

      setRefineInput('');
      setShowRefineModal(false);

    } catch (err: any) {
      console.error(err);
      setError('修改報價時發生錯誤，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const exportTableToCSV = (type: 'area' | 'budget' | 'quotation') => {
    if (!result) return;

    let sectionTitle = '';
    let fileName = '';

    switch (type) {
      case 'area':
        sectionTitle = '【空間面積總表】';
        fileName = '空間面積總表';
        break;
      case 'budget':
        sectionTitle = '【工程預算總表】';
        fileName = '工程預算總表';
        break;
      case 'quotation':
        sectionTitle = '【報價明細表】';
        fileName = '報價明細表';
        break;
    }

    // Find the section
    const lines = result.split('\n');
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(sectionTitle)) {
        startIndex = i;
      } else if (startIndex !== -1 && (lines[i].startsWith('【') || lines[i].startsWith('##')) && i > startIndex) {
        // Stop at next section header (could be 【...】 or ## ...)
        endIndex = i;
        break;
      }
    }

    if (startIndex === -1) {
      alert('找不到指定的表格資料');
      return;
    }

    const sectionLines = endIndex === -1 
      ? lines.slice(startIndex) 
      : lines.slice(startIndex, endIndex);

    // Extract table rows
    const rows = sectionLines.filter(line => line.trim().startsWith('|'));
    
    if (rows.length < 2) {
      alert('找不到表格資料');
      return;
    }

    // Helper to clean cell content and escape for CSV
    const cleanCell = (cell: string) => {
      // Remove markdown bold/italic markers if needed, but for now just trim
      let cleaned = cell.trim();
      
      // Remove markdown bold (**text**)
      cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
      
      if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
        return `"${cleaned.replace(/"/g, '""')}"`;
      }
      return cleaned;
    };

    // Process rows (skip the separator row like |---|---|)
    const csvRows = rows
      .filter(row => !row.match(/^\|?\s*:?-+:?\s*\|/)) // Filter out separator rows
      .map(row => {
        // Remove leading/trailing pipes and split
        // Note: The split logic needs to be robust. Simple split('|') works for simple tables.
        const cells = row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        return cells.map(cleanCell).join(',');
      });

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8 support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `琢見空間_${fileName}_${new Date().toLocaleDateString()}.csv`;
    a.click();
    setShowDownloadMenu(false);
  };

  const clearAll = () => {
    setInput('');
    setImages([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#1A1A1A] p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">琢見空間整合</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Estimator Assistant v1.0</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={clearAll}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              清空內容
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold">需求說明</h2>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="請輸入設計師提供的平面圖說明、空間坪數、材質要求或特殊工法需求... (例如：客廳插座 15 組、主臥插座 6 組)"
                className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none text-sm leading-relaxed"
              />
              
              {/* Smart Packages */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">快速加入工程組合</p>
                  <button 
                    onClick={() => setShowManagePackages(!showManagePackages)}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    管理組合
                  </button>
                </div>

                <AnimatePresence>
                  {showManagePackages && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 overflow-hidden"
                    >
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                        <div className="flex gap-2 items-center">
                          <input
                            placeholder="組合名稱 (如: 浴室翻新)"
                            value={newPackage.label}
                            onChange={e => setNewPackage({...newPackage, label: e.target.value})}
                            className="p-2 text-xs border rounded-lg flex-1"
                          />
                          <button 
                            onClick={handleAddPackage}
                            disabled={!newPackage.label || selectedPackageItems.size === 0}
                            className={`text-white text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              editingPackageIndex !== null ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black hover:bg-gray-800'
                            }`}
                          >
                            {editingPackageIndex !== null ? '儲存修改' : `新增組合 (${selectedPackageItems.size})`}
                          </button>
                          {editingPackageIndex !== null && (
                            <button 
                              onClick={handleCancelEdit}
                              className="bg-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              取消
                            </button>
                          )}
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-2 max-h-60 overflow-y-auto">
                          <p className="text-[10px] text-gray-400 mb-2 font-bold">請勾選此組合包含的工項：</p>
                          {sortedCategories.map((category) => (
                            <div key={category} className="mb-2">
                              <div className="text-xs font-bold text-gray-700 bg-gray-50 p-1 rounded mb-1">{category}</div>
                              <div className="space-y-1 pl-1">
                                {groupedPrices[category].map((item, idx) => {
                                  const key = `${item.category}-${item.name}-${item.spec}`;
                                  const isSelected = selectedPackageItems.has(key);
                                  return (
                                    <label key={idx} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                      <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        onChange={() => togglePackageItem(item)}
                                        className="mt-0.5"
                                      />
                                      <div className="text-xs">
                                        <span className="font-medium text-gray-800">{item.name}</span>
                                        <span className="text-gray-400 ml-1 text-[10px]">({item.spec})</span>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1 mt-2 max-h-40 overflow-y-auto pr-1 border-t border-gray-200 pt-2">
                          <p className="text-[10px] text-gray-400 font-bold">已建立的組合：</p>
                          {packages.map((pkg, i) => (
                            <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-gray-100">
                              <div>
                                <span className="font-bold mr-2">{pkg.label}</span>
                                <span className="text-gray-500 line-clamp-1">{pkg.text.replace(/\n/g, ' ')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleEditPackage(i)} className="text-gray-400 hover:text-blue-500">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDeletePackage(i)} className="text-gray-400 hover:text-red-500">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-wrap gap-2">
                  {packages.map((pkg, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prev => prev ? `${prev}\n${pkg.text}` : pkg.text)}
                      className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                    >
                      + {pkg.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                  <h2 className="font-semibold">圖面參考</h2>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  上傳圖片
                </button>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                multiple
                accept="image/*"
                className="hidden"
              />

              {images.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400">點擊或拖拽上傳平面圖、立面圖或 3D 圖</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={img} alt="upload" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-gray-300" />
                  </button>
                </div>
              )}
            </section>

            <button
              onClick={generateQuotation}
              disabled={loading}
              className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在分析並估算中...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  生成工程報價明細
                </>
              )}
            </button>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            {/* History Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold">歷史紀錄</h2>
              </div>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">尚無歷史紀錄</p>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setResult(item.output);
                        setChartData(item.chartData || null);
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-mono text-gray-400">{item.timestamp}</span>
                        <CheckCircle2 className="w-3 h-3 text-green-500 opacity-0 group-hover:opacity-100" />
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-1">{item.input || "僅圖面分析"}</p>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Price Database Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-gray-400" />
                  <h2 className="font-semibold">常用單價資料庫</h2>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    ref={csvInputRef}
                    onChange={handleCSVImport}
                    accept=".csv"
                    className="hidden"
                  />
                  <button 
                    onClick={() => csvInputRef.current?.click()}
                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-black transition-colors"
                    title="匯入 CSV (格式: 類別,名稱,規格,單位,單價)"
                  >
                    <Upload className="w-3 h-3" />
                    匯入
                  </button>
                  <button 
                    onClick={() => setShowSortModal(true)}
                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-black transition-colors"
                    title="排序類別"
                  >
                    <List className="w-3 h-3" />
                    排序
                  </button>
                  <button 
                    onClick={() => {
                      setNewPrice({ category: '', name: '', spec: '', unit: '', price: '' });
                      setEditingPriceItem(null);
                      setShowAddPrice(true);
                    }}
                    className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    新增項目
                  </button>
                </div>
              </div>

              {/* Sort Modal */}
              <AnimatePresence>
                {showSortModal && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
                    >
                      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">調整類別順序</h3>
                        <button onClick={() => setShowSortModal(false)} className="text-gray-400 hover:text-gray-600">
                          <Trash2 className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                      <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                        {sortedCategories.map((category, index) => (
                          <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">{category}</span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => moveCategory(category, 'up')}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => moveCategory(category, 'down')}
                                disabled={index === sortedCategories.length - 1}
                                className="p-1 text-gray-400 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                        <button 
                          onClick={() => setShowSortModal(false)}
                          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
                        >
                          完成
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Add Price Modal */}
              <AnimatePresence>
                {showAddPrice && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-gray-700">{editingPriceItem ? '編輯單價項目' : '新增單價項目'}</h3>
                        <button onClick={() => setShowAddPrice(false)} className="text-gray-400 hover:text-gray-600">
                          <Trash2 className="w-3 h-3 rotate-45" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="類別 (如: 木作)"
                          value={newPrice.category}
                          onChange={e => setNewPrice({...newPrice, category: e.target.value})}
                          className="p-2 text-xs border rounded-lg"
                        />
                        <input
                          placeholder="項目名稱"
                          value={newPrice.name}
                          onChange={e => setNewPrice({...newPrice, name: e.target.value})}
                          className="p-2 text-xs border rounded-lg"
                        />
                        <input
                          placeholder="規格說明"
                          value={newPrice.spec}
                          onChange={e => setNewPrice({...newPrice, spec: e.target.value})}
                          className="col-span-2 p-2 text-xs border rounded-lg"
                        />
                        <input
                          placeholder="單位"
                          value={newPrice.unit}
                          onChange={e => setNewPrice({...newPrice, unit: e.target.value})}
                          className="p-2 text-xs border rounded-lg"
                        />
                        <input
                          placeholder="單價"
                          value={newPrice.price}
                          onChange={e => setNewPrice({...newPrice, price: e.target.value})}
                          className="p-2 text-xs border rounded-lg"
                        />
                      </div>
                      <button 
                        onClick={handleAddPrice}
                        className="w-full bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {editingPriceItem ? '確認修改' : '確認新增'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  value={priceSearch}
                  onChange={(e) => setPriceSearch(e.target.value)}
                  placeholder="搜尋工項、類別或規格..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-black outline-none transition-all"
                />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {sortedCategories.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 italic">找不到相符的工項</p>
                ) : (
                  sortedCategories.map((category) => {
                    const items = groupedPrices[category];
                    return (
                    <div key={category} className="border border-gray-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-xs font-bold text-gray-700">{category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            {items.length}
                          </span>
                          <ChevronRight 
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              expandedCategories.includes(category) || priceSearch ? 'rotate-90' : ''
                            }`} 
                          />
                        </div>
                      </button>
                      
                      <AnimatePresence>
                        {(expandedCategories.includes(category) || priceSearch) && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-2 space-y-2 bg-white">
                              {items.map((item, idx) => (
                                <div key={idx} className="group relative p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-all hover:bg-gray-50">
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                                    <button 
                                      onClick={() => handleEditPrice(item)}
                                      className="text-gray-400 hover:text-blue-500"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newPrices = prices.filter(p => p !== item);
                                        setPrices(newPrices);
                                        localStorage.setItem('price_database', JSON.stringify(newPrices));
                                      }}
                                      className="text-gray-400 hover:text-red-500"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="flex justify-between items-start mb-1 pr-4">
                                    <h3 className="text-sm font-semibold text-gray-800">{item.name}</h3>
                                    <span className="text-xs font-mono font-bold text-gray-900 whitespace-nowrap ml-2">
                                      ${Number(item.price).toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">/{item.unit}</span>
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 line-clamp-1">{item.spec}</p>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )})
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  * 以上單價僅供參考，實際價格會隨市場波動、施工難度及物料品牌而有所調整。
                </p>
              </div>
            </section>
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result-container"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <h2 className="font-semibold">工程報價明細表</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const blob = new Blob([result], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `琢見空間報價單_${new Date().toLocaleDateString()}.md`;
                          a.click();
                        }}
                        className="text-xs flex items-center gap-1 text-gray-500 hover:text-black transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Markdown
                      </button>
                      <div className="w-px h-3 bg-gray-300" />
                      <button 
                        onClick={() => setShowRefineModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        修改內容
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                          className="text-xs flex items-center gap-1 text-gray-500 hover:text-black transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          下載報表
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        
                        <AnimatePresence>
                          {showDownloadMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20"
                            >
                              <button
                                onClick={() => exportTableToCSV('area')}
                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                空間面積總表
                              </button>
                              <button
                                onClick={() => exportTableToCSV('budget')}
                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                工程預算總表
                              </button>
                              <button
                                onClick={() => exportTableToCSV('quotation')}
                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                報價明細表
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 overflow-x-auto">
                    <div className="markdown-body prose prose-sm max-w-none prose-table:border prose-table:border-gray-200 prose-th:bg-gray-50 prose-th:p-3 prose-td:p-3 prose-td:border prose-td:border-gray-100">
                      <Markdown remarkPlugins={[remarkGfm]}>{result}</Markdown>
                    </div>
                  </div>
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                    <p className="text-[10px] text-gray-400 italic">
                      * 本報價僅供初步參考，實際工程金額需依現場丈量及最終選材為準。
                    </p>
                  </div>
                </div>
                
                {chartData && chartData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6"
                  >
                    <h2 className="font-semibold mb-6 flex items-center gap-2">
                      <div className="w-2 h-6 bg-black rounded-full" />
                      工程預算佔比分析
                    </h2>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={140}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                            labelLine={true}
                          >
                            {chartData.map((entry, index) => {
                              // Colors based on the uploaded reference image: Orange, Red, Dark Grey, Lime Green, Cyan
                              const colors = ['#F5A623', '#F05A50', '#4A5568', '#84CC16', '#06B6D4'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(value)}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[600px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 p-12 text-center"
                >
                  <Calculator className="w-12 h-12 mb-4 opacity-20" />
                  <h3 className="text-lg font-medium mb-2">尚未生成報價</h3>
                  <p className="text-sm max-w-xs">請在左側輸入需求說明或上傳圖面，系統將自動為您產出專業的工程報價明細。</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Refine Modal */}
      <AnimatePresence>
        {showRefineModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">修改報價內容</h3>
                <button onClick={() => setShowRefineModal(false)} className="text-gray-400 hover:text-gray-600">
                  <Trash2 className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-500">
                  請輸入您希望修改的內容，例如：「客廳插座增加 5 組」、「浴室磁磚單價改為 3500」、「刪除全室油漆項目」。
                </p>
                <textarea
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  placeholder="請輸入修改指示..."
                  className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-black outline-none resize-none"
                />
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                <button 
                  onClick={() => setShowRefineModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  取消
                </button>
                <button 
                  onClick={handleRefine}
                  disabled={!refineInput.trim() || loading}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  確認修改
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 opacity-50">
            <Building2 className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-widest uppercase">琢見空間整合有限公司</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 Zhuojian Space Integration. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
