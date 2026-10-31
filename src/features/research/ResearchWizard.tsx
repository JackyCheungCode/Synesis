import React from 'react';
import {
 Button, Tag, TextArea, TextInput, Tile, ProgressIndicator, ProgressStep, Checkbox,
 Tabs, TabList, Tab, TabPanels, TabPanel,
 Accordion, AccordionItem, FluidForm, FormGroup, RadioButtonGroup, RadioButton, ProgressBar,
 unstable__FluidTextInput as FluidTextInput,
 unstable__FluidTextArea as FluidTextArea,
 unstable__FluidDropdown as FluidDropdown,
 unstable__FluidMultiSelect as FluidMultiSelect,
 unstable__FluidComboBox as FluidComboBox,
 unstable__FluidNumberInput as FluidNumberInput,
} from '@carbon/react';
import { Add, ArrowLeft, ArrowRight, Renew, ChartLine, Close } from '@carbon/icons-react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type ResearchDimension = { key:string; label:string; values:string[]; status:'provided'|'suggested'|'needs_confirmation'|'user_confirmed'; note?:string };
export type ResearchProfile = { summary:string; dimensions:ResearchDimension[]; research_goals:string[]; assumptions:string[]; missing_information:string[] };
export type ResearchProject = { id:string; name:string; objective:string; status:string; target_regions:string[]; platform_slugs:string[]; scope?:Record<string,any> };
export type ResearchPlan = { id:string; project_id:string; status:string; plan:Record<string,any>; estimated_cost:number|null; created_at:string };
export type ResearchTask = { id:string; project_id:string; platform_slug:string; status:string; actor_id:string|null; created_at:string; started_at?:string|null; finished_at?:string|null; updated_at?:string|null; external_run_id?:string|null; progress?:number; result_count?:number; result_synced_count?:number; run_status?:string|null; error_message?:string|null };
export type ResearchReport = { id:string; title:string; status:string; created_at:string; project_id:string|null; report_type?:string; evidence?:Array<{task_id?:string;platform_slug?:string}>; content:Record<string,any> };
type Props = {
 projects:ResearchProject[]; plans:ResearchPlan[]; tasks:ResearchTask[]; reports:ResearchReport[];
 projectId?:string; busy:boolean; projectResultRows?:Array<{task_id:string;platform_slug:string;item_index:number;raw_data:unknown}>; projectResultTotal?:number; projectResultOffset?:number; onLoadProjectResults:(projectId:string,offset?:number)=>void; onParse:(brief:string)=>Promise<ResearchProfile>; onCreate:(brief:string,profile:ResearchProfile,projectId?:string)=>void;
 onSaveDraft:(draft:{brief:string;formValues:Record<string,string>;profile:ResearchProfile|null;activeStep:number;selectedSources:string[]},projectId?:string)=>void;
 onOpen:(id:string)=>void; onBack:()=>void; onGeneratePlan:(project:ResearchProject,categories:string[])=>void;
 onApprove:(plan:ResearchPlan)=>void; onCancel:(task:ResearchTask)=>void;
 onRetry:(task:ResearchTask)=>void; onSync:(task:ResearchTask)=>void; onView:(task:ResearchTask)=>void; onAnalyze:(task:ResearchTask)=>void;
 analytics?:any; analyticsTaskId?:string; taskLogs?:Record<string,string[]>; onLoadLogs:(task:ResearchTask)=>void;
 onSaveAnalytics:()=>void; onGenerateReport:(projectId:string)=>void;
};
const stages=['研究需求','调研平台','数据抓取','数据统计','AI 分析报告'];
const statusLabel:Record<ResearchDimension['status'],string>={provided:'用户已提供',suggested:'AI 建议',needs_confirmation:'待补充确认',user_confirmed:'用户已确认'};
const statusType:Record<ResearchDimension['status'],'green'|'blue'|'warm-gray'>={provided:'green',suggested:'blue',needs_confirmation:'warm-gray',user_confirmed:'green'};
const dimensionGroups=[
 {title:'市场与地域',description:'确定研究覆盖的国家、地区和语言。',keys:['keywords','languages','countries','regions','time_range']},
 {title:'商品与品牌',description:'定义研究对象、产品范围和竞品边界。',keys:['product_categories','product_attributes','brands','models_identifiers','price_range','usage_scenarios','certifications']},
 {title:'商业与渠道',description:'描述客户、销售路径、供应链和研究范围。',keys:['target_customers','sales_channels','competitors','reference_urls','origin_supply_markets','logistics_attributes','exclusions']},
];
const sourceGroups=[
 {id:'ecommerce',title:'电商与零售',desc:'商品、价格、评论、店铺与竞品广告',items:['Amazon','eBay','Walmart','Etsy','AliExpress','Shopify 独立站','TikTok Shop','Temu','Shopee','Lazada','Tokopedia','Allegro','idealo','Craigslist','Meta Ad Library','淘宝','天猫','1688','京东','拼多多','闲鱼 Goofish','抖音商城','小红书商城','日本乐天 Rakuten','Yahoo! Shopping Japan','Qoo10','Mercari Japan']},
 {id:'social',title:'社交媒体与内容',desc:'帖子、视频、创作者、互动、评论与话题',items:['TikTok','Instagram','YouTube','X / Twitter','LinkedIn','Facebook','Reddit','Threads','Bluesky','Pinterest','Snapchat','Twitch','抖音 Douyin','小红书 Xiaohongshu','微博 Weibo','Bilibili','知乎','豆瓣','雪球','LINE 公开内容']},
 {id:'search',title:'搜索引擎与 SEO',desc:'搜索结果、关键词、趋势、地图与新闻',items:['Google Search','Google Maps','Google Trends','Google Autocomplete','Google News','Bing','Baidu 百度','Yandex','Naver','Yahoo Search','DuckDuckGo','Brave Search','搜狗','360 搜索','Yahoo! Japan']},
 {id:'b2b',title:'B2B 线索与商业情报',desc:'企业、联系人、商业登记、技术栈与企业关系',items:['Google Maps 商家','LinkedIn 公司页','LinkedIn 公开人物资料','Crunchbase','OpenCorporates','Companies House','Florida Sunbiz','Alabama Business Entity','美国各州企业登记','BuiltWith','Wappalyzer','Similarweb','企查查','天眼查','爱企查','国家企业信用信息公示系统','日本法人番号公表网站','韩国 DART','香港公司注册处']},
 {id:'jobs',title:'招聘与人力资源',desc:'职位、薪资、技能需求、企业招聘与人才趋势',items:['LinkedIn Jobs','Indeed','Glassdoor','Google Jobs','ZipRecruiter','Wellfound','Monster','CareerBuilder','Remote OK','We Work Remotely','Himalayas','BOSS 直聘','前程无忧 51Job','智联招聘','猎聘','拉勾网','日本 doda','日本 Mynavi','韩国 JobKorea','韩国 Saramin','新加坡 JobStreet']},
 {id:'realestate',title:'房产、住宿与本地服务',desc:'房源、租赁、酒店、民宿、商家与消费者点评',items:['Zillow','Redfin','Realtor.com','Apartments.com','Facebook Marketplace 房源','Rightmove','Zoopla','ImmobilienScout24','SUUMO','LIFULL HOME\'S','Airbnb','Booking.com','Trip.com','Expedia','Agoda','Hotels.com','Vrbo','Yelp','Tripadvisor','Trustpilot','大众点评','美团','OpenRice','HotPepper Beauty']},
 {id:'news',title:'新闻、学术与研究',desc:'新闻事件、行业资讯、论文、研究机构与 RSS',items:['Google News','BBC','Reuters','TechCrunch','Wired','The New York Times','The Guardian','Financial Times','Bloomberg','Hacker News','ESPN','新浪新闻','网易新闻','腾讯新闻','澎湃新闻','36氪','虎嗅','界面新闻','财新','日经新闻 Nikkei','韩国 Yonhap News','RSS / Atom','arXiv','Hugging Face Papers','Europe PMC','PubMed','Crossref','OpenAlex','Semantic Scholar']},
 {id:'publicdata',title:'公共数据与政府记录',desc:'监管披露、政府采购、企业登记、统计与开放数据',items:['SEC EDGAR','USAspending.gov','Grants.gov','FEC','EPA','ClinicalTrials.gov','openFDA','NHTSA','OFAC','PACER 联邦法院','CMS Provider Data','IRS 990','EU TED','GLEIF','World Bank Open Data','OECD Data','UN Comtrade','Eurostat','日本 e-Stat','韩国 KOSIS','中国国家统计局']},
 {id:'apps',title:'应用商店',desc:'应用资料、评分、评论、版本、开发者与 ASO',items:['Google Play','Apple App Store','华为应用市场','小米应用商店','OPPO 软件商店','vivo 应用商店','腾讯应用宝','百度手机助手','日本 App Store','韩国 Google Play']},
 {id:'web',title:'通用网页与 RAG',desc:'公开 URL、企业网站、产品页、文档、PDF 与知识库',items:['任意公开网站 URL','企业官网','竞品独立站','商品详情页','产品目录','博客与新闻网页','技术文档','帮助中心','公开 PDF','Sitemap','RSS / Atom Feed','论坛与社区公开页面']}
];
const asiaPlatformNames=new Set(['淘宝','天猫','1688','京东','拼多多','闲鱼 Goofish','抖音商城','小红书商城','日本乐天 Rakuten','Yahoo! Shopping Japan','Qoo10','Mercari Japan','抖音 Douyin','小红书 Xiaohongshu','微博 Weibo','Bilibili','知乎','豆瓣','雪球','LINE 公开内容','Baidu 百度','搜狗','360 搜索','Naver','Yahoo! Japan','企查查','天眼查','爱企查','国家企业信用信息公示系统','日本法人番号公表网站','韩国 DART','香港公司注册处','BOSS 直聘','前程无忧 51Job','智联招聘','猎聘','拉勾网','日本 doda','日本 Mynavi','韩国 JobKorea','韩国 Saramin','新加坡 JobStreet','SUUMO','LIFULL HOME\'S','大众点评','美团','OpenRice','HotPepper Beauty','新浪新闻','网易新闻','腾讯新闻','澎湃新闻','36氪','虎嗅','界面新闻','财新','日经新闻 Nikkei','韩国 Yonhap News','日本 e-Stat','韩国 KOSIS','中国国家统计局','华为应用市场','小米应用商店','OPPO 软件商店','vivo 应用商店','腾讯应用宝','百度手机助手','日本 App Store','韩国 Google Play']);
const dropdownOptions:Record<string,string[]>={languages:['英语','德语','法语','西班牙语','意大利语','日语','韩语','中文','多语言 / 自动识别'],time_range:['近 30 天','近 90 天','近 6 个月','近 12 个月','近 24 个月','全部可用历史数据','自定义（在补充说明中填写）'],business_goals:['市场进入可行性','新品选品与产品开发','竞争对手分析','市场定价分析','消费者需求洞察','寻找供应商与制造商','销售渠道策略','品牌定位与营销策略','综合市场研究']};
const fieldSpecs=[
 ['keywords','核心关键词','例如：智能喂食器、自动猫砂盆'],
 ['countries','目标国家','例如：德国、法国、美国'],
 ['regions','目标地区 / 城市','例如：加州、巴伐利亚州'],
 ['languages','研究语言','例如：英语、德语、法语'],
 ['product_categories','产品类别','例如：宠物智能用品'],
 ['product_attributes','产品属性与规格','例如：容量、材质、尺寸、连接方式'],
 ['brands','品牌','例如：Petkit、PETLIBRO'],
 ['models_identifiers','型号 / SKU / UPC / EAN','可填写多个标识符'],
 ['price_range','价格范围与币种','例如：20–150 EUR'],
 ['time_range','研究时间范围','例如：近 12 个月'],
 ['target_customers','目标客户群体','例如：养猫家庭、宠物店'],
 ['sales_channels','销售渠道','例如：Amazon、独立站、线下零售'],
 ['competitors','竞争对手','填写品牌或企业名称'],
 ['reference_urls','参考 URL / 社交账号','可填写多个网址，每行一个'],
 ['origin_supply_markets','原产地 / 供应链市场','例如：中国、越南'],
 ['certifications','认证与合规要求','例如：CE、RoHS、FCC'],
 ['usage_scenarios','使用场景','例如：上班族、长时间离家'],
 ['logistics_attributes','包装与物流属性','例如：易碎、带电池、体积重量'],
 ['exclusions','排除条件','例如：排除二手商品、低评分商品'],
 ['purchase_requirements','采购数量与成本要求','例如：首单 500 件，目标 FOB 成本'],
 ['business_goals','商业目标与研究问题','例如：寻找新品机会、评估进入德国市场的可行性'],
 ['other_constraints','其他约束条件','填写其他必须遵守的研究限制'],
 ['other_research_notes','其他研究说明 / 自然语言补充','补充背景、研究假设、特殊关注点或其他说明'],
];
function flagImageUrl(code:string){return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;}
const legacyCountryNames=new Intl.DisplayNames(['zh-Hant'],{type:'region'});
const ISO_3166_1_CODES='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
function buildCountryOptions() {
 const names=new Intl.DisplayNames(['zh-CN'],{type:'region'});
 return ISO_3166_1_CODES.map(code=>{
  const name=names.of(code)??code;
  const text=code==='CN'?'中国大陆':code==='HK'?'中国香港':code==='MO'?'中国澳门':code==='TW'?'中国台湾':code==='XK'?'科索沃':name;
  return {id:code,text,legacyText:legacyCountryNames.of(code)??code,flag:flagImageUrl(code)};
 }).sort((a,b)=>a.text.localeCompare(b.text,'zh-CN'));
}
type CountryOptionItem={id:string;text:string;legacyText?:string;flag:string};
const countryOptions:CountryOptionItem[]=buildCountryOptions();
function CountryOptionElement(value:unknown):React.ReactElement {
 const item=value as CountryOptionItem;
 return <span className="research-country-option"><img className="research-country-flag" src={item.flag} alt="" loading="lazy"/><span>{item.text}</span></span>;
}
const englishRegionNames=new Intl.DisplayNames(['en'],{type:'region'});
const WORLD_GEOJSON_URL='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_units.geojson';
function CountryMapViewport({features}:{features:any[]}) {
 const map=useMap();
 React.useEffect(()=>{
  const container=map.getContainer();
  if(typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(()=>map.invalidateSize({pan:false}));
  observer.observe(container);
  return ()=>observer.disconnect();
 },[map]);
 React.useEffect(()=>{
  if(!features.length){map.setView([20,0],2);return;}
  map.invalidateSize();
  const bounds=L.featureGroup(features.map(feature=>L.geoJSON(feature))).getBounds();
  if(bounds.isValid())map.fitBounds(bounds.pad(.18),{maxZoom:10,animate:true});
 },[map,features]);
 return null;
}
function CountrySelectionMap({selectedCodes}:{selectedCodes:string[]}) {
 const [world,setWorld]=React.useState<any>(null);
 const [loadError,setLoadError]=React.useState(false);
 React.useEffect(()=>{
  let active=true;
  fetch(WORLD_GEOJSON_URL).then(response=>{if(!response.ok)throw new Error('GeoJSON unavailable');return response.json();})
   .then(data=>{if(active)setWorld(data);}).catch(()=>{if(active)setLoadError(true);});
  return ()=>{active=false;};
 },[]);
 const features=React.useMemo(()=>{
  if(!world?.features?.length||!selectedCodes.length)return [];
  const nameAliases:Record<string,string[]>={CN:['China'],HK:['Hong Kong'],MO:['Macao','Macau'],TW:['Taiwan'],US:['United States','United States of America'],GB:['United Kingdom'],KR:['South Korea','Republic of Korea'],KP:['North Korea','Dem. Rep. Korea'],RU:['Russia','Russian Federation'],IR:['Iran'],SY:['Syria'],BO:['Bolivia'],VE:['Venezuela'],TZ:['Tanzania'],MD:['Moldova'],VN:['Vietnam'],LA:['Laos'],BN:['Brunei'],CZ:['Czechia','Czech Republic'],MK:['North Macedonia'],PS:['Palestine'],VA:['Vatican'],FM:['Federated States of Micronesia'],XK:['Kosovo','Republic of Kosovo']};
  const selectedNames=new Set(selectedCodes.flatMap(code=>[englishRegionNames.of(code)??'',...(nameAliases[code]??[])].map(name=>name.trim().toLocaleLowerCase('en')).filter(Boolean)));
  return world.features.filter((feature:any)=>{
   const props=feature.properties??{};
   const codes=[props['ISO3166-1-Alpha-2'],props.ISO_A2_EH,props.ISO_A2,props.iso_a2,props.WB_A2,props.POSTAL];
   if(codes.some(code=>selectedCodes.includes(String(code??'').toUpperCase())))return true;
   const names=[props.name,props.NAME,props.ADMIN,props.admin,props.NAME_EN,props.NAME_LONG,props.SOVEREIGNT,props.FORMAL_EN].filter(Boolean).map((name:any)=>String(name).trim().toLocaleLowerCase('en'));
   return names.some((name:string)=>selectedNames.has(name));
  });
 },[world,selectedCodes.join(',')]);
 return <div className="research-country-map-wrap">
  <div className="research-country-map-heading"><b>目标市场地图</b><span>{selectedCodes.length?selectedCodes.length+' 个国家 / 地区已选':'选择国家后自动定位并高亮'}</span></div>
  <MapContainer center={[20,0]} zoom={2} scrollWheelZoom={false} className="research-country-map">
   <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
   {features.length>0&&<GeoJSON key={selectedCodes.join('-')} data={{type:'FeatureCollection',features} as any} style={()=>({color:'#0f62fe',weight:2,fillColor:'#0f62fe',fillOpacity:.28})}/>}
   <CountryMapViewport features={features}/>
  </MapContainer>
  {loadError&&<p className="research-map-note" role="status">地图边界数据暂时无法载入，请检查网络连接后重试。</p>}{!loadError&&!world&&<p className="research-map-note" role="status">正在载入国家边界数据…</p>}{!loadError&&selectedCodes.length>0&&world&&!features.length&&<p className="research-map-note" role="status">未匹配到所选地区的 GeoJSON 边界（{selectedCodes.join(', ')}）。</p>}{!loadError&&features.length>0&&<p className="research-map-note" role="status">已高亮 {features.length} 个地图区域。</p>}
 </div>;
}
const languageOptions=['英语','中文','德语','法语','西班牙语','意大利语','日语','韩语','荷兰语','阿拉伯语','多语言 / 自动识别'];
const categoryOptions=['消费电子','家居用品','厨房用品','宠物用品','美容与个人护理','运动与户外','母婴用品','服装与配饰','汽车用品','工业与商业用品'];
const supplyOptions=['中国','越南','印度','泰国','马来西亚','印度尼西亚','台湾','韩国','日本','美国','德国','墨西哥','土耳其'];
const complianceOptions=['CE','RoHS','FCC','UKCA','REACH','FDA','CPC','Prop 65'];
const logisticsOptions=['易碎','带电池','大件','液体','粉末','温控','危险品限制','超重'];
const channelOptions=['Amazon','eBay','Walmart','Etsy','AliExpress','Alibaba.com','TikTok Shop','Shopify','Temu','SHEIN','淘宝','天猫','京东','拼多多','抖音电商','小红书','快手电商','唯品会','Shopee','Lazada','Mercado Libre','Rakuten','Coupang','独立站','线下零售'];
const goalOptions=['市场进入','竞品分析','选品开发'];
const toItems=(values:string[])=>values.map(value=>({id:value,text:value}));
function ResearchProgress({activeStep,maxUnlockedStep,stepReady}:{activeStep:number;maxUnlockedStep:number;stepReady:boolean[]}) {
 return <Tile className="research-progress-tile">
  <div className="module-heading"><div><h3 className="cds--type-heading-03">五步研究工作流</h3><p>按顺序完成研究流程；后续步骤将在前置数据准备完成后解锁。</p></div><Tag type="blue" className="synesis-workspace-tag">第 {activeStep+1} / 5 步</Tag></div>
  <ProgressIndicator currentIndex={activeStep} spaceEqually className="research-carbon-progress">
   {stages.map((label,index)=><ProgressStep key={label} label={label} description={index===activeStep?'当前步骤':stepReady[index]?'已满足前置条件':'等待前序步骤完成'} complete={stepReady[index]&&index<activeStep} current={index===activeStep} disabled={index>maxUnlockedStep}/>)}
  </ProgressIndicator>
 </Tile>;
}
type UnifiedResultRow={task_id:string;platform_slug:string;item_index:number;raw_data:unknown};
const unifiedColumns:{label:string;patterns:RegExp[]}[]=[
 {label:'标题 / 主体名称',patterns:[/^(title|name|product.?name|item.?name|headline|job.?title|company.?name|app.?name|property.?name)$/i]},
 {label:'品牌 / 作者 / 来源',patterns:[/^(brand(name)?|author|creator|publisher|source|seller.?name|developer.?name|company)$/i]},
 {label:'描述 / 内容',patterns:[/^(description|summary|snippet|caption|text|content|excerpt)$/i]},
 {label:'价格 / 金额',patterns:[/^(price|sale.?price|current.?price|amount|salary|award.?amount|contract.?value)$/i]},
 {label:'评分',patterns:[/^(rating|stars|score|average.?rating|review.?score)$/i]},
 {label:'评论数',patterns:[/^review.?count$/i,/^reviews.?count$/i,/^comments?(?:.?count)?$/i,/^replies?(?:.?count)?$/i]},
 {label:'浏览 / 播放量',patterns:[/^views?(?:.?count)?$/i,/^play.?count$/i,/^video.?views?$/i,/^installs$/i,/^downloads$/i]},
 {label:'点赞数',patterns:[/^likes?(?:.?count)?$/i,/^digg.?count$/i,/^favorite.?count$/i]},
 {label:'地区 / 地址',patterns:[/^(location|address|city|country|region|headquarters)$/i]},
 {label:'日期',patterns:[/^(published.?at|created.?at|posted.?at|timestamp|date|updated.?at)$/i]},
 {label:'来源链接',patterns:[/^(url|link|permalink|source.?url|product.?url|article.?url|job.?url)$/i]},
];
function CrossPlatformResultsTable({rows}:{rows:UnifiedResultRow[]}) {
 const records=rows.map(row=>({meta:row,record:row.raw_data&&typeof row.raw_data==='object'&&!Array.isArray(row.raw_data)?row.raw_data as Record<string,unknown>:{}}));
 const columns=unifiedColumns.map(field=>({label:field.label,pattern:field.patterns})).filter(field=>records.some(({record})=>Object.keys(record).some(key=>field.pattern.some(pattern=>pattern.test(key)))));
 const read=(record:Record<string,unknown>,patterns:RegExp[])=>{const key=Object.keys(record).find(name=>patterns.some(pattern=>pattern.test(name)));return key?record[key]:null;};
 const format=(value:unknown)=>value===null||value===undefined||value===''?'—':typeof value==='object'?JSON.stringify(value):String(value);
 if(!records.length)return <div className="platform-results-empty"><p>当前项目还没有已同步的记录。</p><small>采集任务同步数据后，这里会自动汇总所有平台的共性字段。</small></div>;
 return <div className="cross-platform-results-wrap"><table className="cross-platform-results-table"><thead><tr><th>数据来源</th><th>记录序号</th>{columns.map(column=><th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{records.map(({meta,record})=><tr key={meta.task_id+'-'+meta.item_index}><td><Tag type="blue">{meta.platform_slug}</Tag></td><td>{meta.item_index+1}</td>{columns.map(column=><td key={column.label} title={format(read(record,column.pattern))}>{format(read(record,column.pattern))}</td>)}</tr>)}</tbody></table></div>;
}

function ResearchAnalyticsView({data}:{data:any}) {
 const metrics=data?.metrics??{}, distributions=data?.distributions??{};
 const sections=[
  {title:'价格区间',items:distributions.price_bands??[],label:(x:any)=>x.label??'区间'},
  {title:'国家 / 地区分布',items:distributions.countries??[],label:(x:any)=>x.label??'地区'},
  {title:'品牌分布',items:distributions.brands??[],label:(x:any)=>x.label??'品牌'},
  {title:'商品类目分布',items:distributions.categories??[],label:(x:any)=>x.label??'类目'},
  {title:'评分分布',items:distributions.rating_distribution??[],label:(x:any)=>String(x.rating??'')+' 星'},
  {title:'消费者评价关键词',items:distributions.review_words??[],label:(x:any)=>x.label??'关键词'},
 ];
 return <div className="research-analytics-view">
  <div className="research-analytics-source"><b>统计覆盖</b><span>{Number(data?.coverage?.analyzed??0).toLocaleString()} / {Number(data?.coverage?.available??0).toLocaleString()} 条记录</span></div>
  <div className="research-analytics-kpis">{[['平均价格',metrics.average_price==null?'—':Number(metrics.average_price).toFixed(2)+' '+(metrics.price_currency??'')],['最低价格',metrics.min_price==null?'—':String(metrics.min_price)],['最高价格',metrics.max_price==null?'—':String(metrics.max_price)],['平均评分',metrics.average_rating==null?'—':Number(metrics.average_rating).toFixed(2)],['平均评价数',metrics.average_reviews==null?'—':Number(metrics.average_reviews).toFixed(1)],['价格样本',Number(metrics.price_count??0).toLocaleString()+' 条']].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
  <div className="research-analytics-grid">{sections.map(section=><section className="research-analytics-panel" key={section.title}><h4>{section.title}</h4>{section.items.length?section.items.slice(0,10).map((item:any,index:number)=>{const count=Number(item.count??0);const max=Math.max(1,...section.items.map((x:any)=>Number(x.count??0)));return <div className="research-chart-row" key={index}><div><span>{section.label(item)}</span><b>{count.toLocaleString()}</b></div><div className="research-chart-track"><i style={{width:(count/max*100)+'%'}}/></div></div>}):<p className="research-empty-chart">来源未提供可识别字段，暂无可展示数据。</p>}</section>)}</div>
  <section className="research-analytics-panel"><h4>数据字段覆盖率</h4><div className="research-quality-grid">{Object.entries(data?.quality??{}).map(([key,value])=><div key={key}><span>{key.replace(/_rate$/,'').replaceAll('_',' ')}</span><b>{(Number(value)*100).toFixed(1)}%</b></div>)}</div></section>
 </div>;
}
function stageIndex(plan:ResearchPlan|undefined,tasks:ResearchTask[],reports:ResearchReport[]) {
 if(reports.some(report=>report.report_type==='market_research'))return 4;
 if(tasks.length>0&&tasks.every(task=>reports.some(report=>report.report_type==='dataset_analytics'&&report.evidence?.some(item=>item.task_id===task.id))))return 4;
 if(tasks.length&&tasks.every(t=>t.status==='succeeded'&&Number(t.result_synced_count??0)>=Number(t.result_count??0)))return 3;
 if(tasks.length)return 2;
 if(plan)return 1;
 return 0;
}
const splitValues=(value:string)=>value.split(/\n|,/).map(v=>v.trim()).filter(Boolean);
const formatPriceRange=(min:string|undefined,max:string|undefined,currency:string|undefined)=>{const values=[min,max].filter((value):value is string=>Boolean(value?.trim()));return values.length?values.join(' - ')+' '+(currency||'USD'):'';};
export function ResearchWizard(props:Props) {
 const {projects,plans,tasks,reports,projectId,busy,onParse,onCreate,onOpen,onBack,onGeneratePlan,onApprove,onCancel,onRetry,onSync,onView,onAnalyze,analytics,analyticsTaskId,taskLogs={},onLoadLogs,onSaveAnalytics,onGenerateReport,onSaveDraft}=props;
 const [brief,setBrief]=React.useState('');
 const [formValues,setFormValues]=React.useState<Record<string,string>>({});
 const [profile,setProfile]=React.useState<ResearchProfile|null>(null);
 const [parseError,setParseError]=React.useState('');
 const [customLabel,setCustomLabel]=React.useState('');
 const [customValue,setCustomValue]=React.useState('');
 const [activeStep,setActiveStep]=React.useState(0);
 const [selectedSources,setSelectedSources]=React.useState<string[]>([]);
 const [activeSourceTab,setActiveSourceTab]=React.useState(0);
 const [openPanels,setOpenPanels]=React.useState([true,false,false,false]);
 const [touchedRequired,setTouchedRequired]=React.useState({keywords:false,countries:false,languages:false});
 const project=projects.find(p=>p.id===projectId);
 const projectPlans=plans.filter(p=>p.project_id===projectId); const plan=projectPlans[0];
 const projectTasks=tasks.filter(t=>t.project_id===projectId); const projectReports=reports.filter(r=>r.project_id===projectId);
 const proposedTasks=Array.isArray(plan?.plan?.platform_tasks)?plan.plan.platform_tasks:[];
 const actorsReady=proposedTasks.length>0&&proposedTasks.every((task:any)=>typeof task.actor_id==='string'&&task.actor_id.trim().length>0&&task.schema_valid===true);
 const synced=projectTasks.reduce((sum,t)=>sum+Number(t.result_synced_count??0),0);
 const expected=projectTasks.reduce((sum,t)=>sum+Number(t.result_count??0),0);
 const allSynced=projectTasks.length>0&&projectTasks.every(t=>t.status==='succeeded'&&Number(t.result_synced_count??0)>=Number(t.result_count??0));
 React.useEffect(()=>{if(project){if(project.scope?.workflow_state==='draft'){setActiveStep(0);setBrief(String(project.scope?.original_brief??project.objective??''));setFormValues((project.scope?.intake_form??{}) as Record<string,string>);setProfile((project.scope?.research_profile??null) as ResearchProfile|null);}else{const savedStep=Number(project.scope?.active_step);setActiveStep(Number.isInteger(savedStep)&&savedStep>=0&&savedStep<=4?savedStep:stageIndex(plan,projectTasks,projectReports));}const stored=project.scope?.selected_data_sources;if(Array.isArray(stored))setSelectedSources(stored as string[]);}else{setActiveStep(0);setSelectedSources([]);setBrief('');setFormValues({});setProfile(null);}},[projectId,project?.id,project?.scope?.workflow_state,plan?.id,projectTasks.length,projectReports.length]);
 React.useEffect(()=>{if(projectId&&activeStep===3)onLoadProjectResults(projectId,0);},[projectId,activeStep]);
 const runningTaskKey=projectTasks.map(task=>task.id+':'+task.status+':'+String(task.external_run_id??'')).join('|');
 React.useEffect(()=>{
  if(!projectId||activeStep!==2||!projectTasks.some(task=>task.external_run_id))return;
  const poll=()=>projectTasks.filter(task=>task.external_run_id).forEach(onLoadLogs);
  poll();
  if(!projectTasks.some(task=>['queued','running'].includes(task.status)))return;
  const timer=window.setInterval(poll,8000);
  return ()=>window.clearInterval(timer);
 },[activeStep,projectId,runningTaskKey]);
 async function parseBrief(){
  const formBrief=fieldSpecs.map(([key,label])=>formValues[key]?.trim()?label+'：'+formValues[key].trim():'').filter(Boolean).join('\n');
  const combined=[formBrief,brief.trim()].filter(Boolean).join('\n\n补充说明：\n');
  if(!combined.trim())return;
  setParseError('');
  try{setProfile(await onParse(combined));}catch(error){setParseError(error instanceof Error?error.message:'AI 解析失败，请稍后重试。');}
 }
 function updateDimension(key:string,raw:string){if(!profile)return;const values=splitValues(raw);setProfile({...profile,dimensions:profile.dimensions.map(item=>item.key===key?{...item,values,status:values.length?'user_confirmed':'needs_confirmation'}:item)});}
 function addCustomDimension(){if(!profile||!customLabel.trim()||!customValue.trim())return;setProfile({...profile,dimensions:[...profile.dimensions,{key:'custom_'+Date.now(),label:customLabel.trim(),values:splitValues(customValue),status:'user_confirmed'}]});setCustomLabel('');setCustomValue('');}
 const confirmedCount=profile?.dimensions.filter(item=>item.status==='provided'||item.status==='user_confirmed').length??0;
 const suggestedCount=profile?.dimensions.filter(item=>item.status==='suggested').length??0;
 const missingCount=profile?.dimensions.filter(item=>item.status==='needs_confirmation').length??0;
 const requiredReady=Boolean(formValues.keywords?.trim()&&formValues.countries?.trim()&&formValues.languages?.trim());
 const getFieldValue=(key:string)=>key==='other_research_notes'?(brief.trim()||formValues[key]||''):(formValues[key]??'');
 const filledFieldCount=fieldSpecs.filter(([key])=>getFieldValue(key).trim().length>0).length;
 const completeness=Math.round(filledFieldCount/fieldSpecs.length*100);
 const selectedLabels=splitValues(formValues.countries??'');
 const selectedCountryItems=countryOptions.filter(item=>selectedLabels.includes(item.text)||selectedLabels.includes(item.legacyText??'')||selectedLabels.includes(item.id));
 const selectedCountryCodes=selectedCountryItems.map(item=>item.id);
 const selectedCountrySummary=selectedCountryItems.length
  ? selectedCountryItems.slice(0,3).map(item=>item.text).join('、')+(selectedCountryItems.length>3?' 等 '+selectedCountryItems.length+' 个地区':'')
  : '搜索并选择国家或地区';
 function createProfileFromForm():ResearchProfile {
  const dimensions=fieldSpecs.filter(([key])=>getFieldValue(key).trim()).map(([key,label])=>({key,label,values:splitValues(getFieldValue(key)),status:'provided' as const}));
  return {summary:'根据用户填写的结构化研究需求建立的研究画像。',dimensions,research_goals:splitValues(formValues.business_goals??''),assumptions:[],missing_information:[]};
 }
 function proceedToSources(){
  setTouchedRequired({keywords:true,countries:true,languages:true});
  if(!requiredReady)return;
  const formBrief=fieldSpecs.map(([key,label])=>formValues[key]?.trim()?label+'：'+formValues[key].trim():'').filter(Boolean).join('\n');
  const combined=[formBrief,brief.trim()].filter(Boolean).join('\n\n补充说明：\n');
  onCreate(combined,profile??createProfileFromForm(),project?.id);
 }
 if(!project||project.scope?.workflow_state==='draft')return <section className="module-stack research-workspace research-fullwidth">
  <ResearchProgress activeStep={0} maxUnlockedStep={0} stepReady={[true,false,false,false,false]}/>
  <Tile className="research-start-tile">
   <header className="research-intake-header">
    <div className="research-intake-heading-copy">
     <p className="eyebrow">RESEARCH WORKSPACE / STEP 01</p>
     <h2 className="cds--type-heading-03">建立你的市场研究需求</h2>
     <p>定义市场、商品与商业目标。填写已知信息即可，暂时不确定的字段可以留空。</p>
    </div>
    <div className="research-intake-header-meta"><Tag type="blue">需求配置</Tag><span>约 5–10 分钟</span></div>
   </header>
   <div className="research-intake-completeness"><div><b>研究需求完整度</b><Tag type={completeness===100?"green":"blue"}>{completeness}%</Tag><span>{filledFieldCount} / {fieldSpecs.length} 项已填写</span></div><ProgressBar label="研究需求完整度" value={completeness} max={100} helperText="填写越完整，后续调研平台匹配越准确。"/></div>
   <div className="research-intake-guidance"><span className="research-guidance-mark">i</span><p><b>填写提示</b>　先确定研究市场与核心关键词，再补充产品、渠道和供应链信息。AI 整理时会区分用户提供的信息与模型建议，不会覆盖你填写的内容。</p></div>
   <FluidForm className="research-fluid-form">
    <Accordion align="start" className="research-intake-accordion">
     <AccordionItem title={<span className="research-accordion-title"><b>01</b> 核心研究目标 <small>研究范围、关键词与目标市场</small></span>} open={openPanels[0]} onHeadingClick={({isOpen}:any)=>setOpenPanels(v=>v.map((x,i)=>i===0?!isOpen:x))}>
      <div className="research-fluid-grid">
       <div className="research-fluid-field research-fluid-span" onBlurCapture={()=>setTouchedRequired(v=>({...v,keywords:true}))}><FluidTextInput id="intake-keywords" labelText="核心关键词 *" value={formValues.keywords??''} placeholder="例如：智能喂食器、自动猫砂盆、宠物饮水机" invalid={touchedRequired.keywords&&!formValues.keywords?.trim()} invalidText="请输入至少一个核心关键词。"  onChange={(e:any)=>{setFormValues(v=>({...v,keywords:e.target.value}));setProfile(null);}}/><small className="cds--form__helper-text">必填。多个关键词请使用逗号分隔。</small></div>
       <div className="research-fluid-field research-fluid-span research-country-field" onBlurCapture={()=>setTouchedRequired(v=>({...v,countries:true}))}><FluidMultiSelect id="intake-countries" titleText="目标国家 / 地区 *" label={selectedCountrySummary} items={countryOptions} itemToString={(item:any)=>item?.text??''} itemToElement={CountryOptionElement} selectedItems={selectedCountryItems} onChange={({selectedItems}:any)=>{setFormValues(v=>({...v,countries:(selectedItems??[]).map((x:any)=>x.text).join(', ')}));setProfile(null);}} selectionFeedback="top-after-reopen" invalid={touchedRequired.countries&&!formValues.countries?.trim()} invalidText="请至少选择一个目标国家或地区。"/></div>
       <div className="research-fluid-field research-fluid-span"><div className="research-selected-countries" aria-label="已选择的国家和地区">{selectedCountryItems.map(item=><span className="research-selected-country" key={item.id}><img className="research-selected-country-flag" src={item.flag} alt="" loading="lazy"/><span className="research-selected-country-name">{item.text}</span><Button kind="ghost" size="sm" hasIconOnly renderIcon={Close} iconDescription={`移除${item.text}`} onClick={()=>{setFormValues(v=>({...v,countries:splitValues(v.countries??'').filter(value=>value!==item.text&&value!==item.legacyText&&value!==item.id).join(', ')}));setProfile(null);}}/></span>)}</div></div>
        <div className="research-fluid-field research-fluid-span"><CountrySelectionMap selectedCodes={selectedCountryCodes}/></div>
       <div className="research-fluid-field"><FluidTextInput id="intake-regions" labelText="目标地区 / 城市" value={formValues.regions??''} placeholder="例如：加州、巴伐利亚州、伦敦" onChange={(e:any)=>{setFormValues(v=>({...v,regions:e.target.value}));setProfile(null);}}/></div>
       <div className="research-fluid-field" onBlurCapture={()=>setTouchedRequired(v=>({...v,languages:true}))}><FluidDropdown id="intake-languages" titleText="研究语言 *" label="选择研究语言" items={toItems(languageOptions)} itemToString={(item:any)=>item?.text??''} selectedItem={toItems(languageOptions).find(x=>x.id===formValues.languages)??null} onChange={({selectedItem}:any)=>{setFormValues(v=>({...v,languages:selectedItem?.id??''}));setProfile(null);}} invalid={touchedRequired.languages&&!formValues.languages?.trim()} invalidText="请选择研究语言。" /></div>
       <div className="research-fluid-field"><FluidDropdown id="intake-time-range" titleText="研究时间范围" label="选择时间范围" items={toItems(dropdownOptions.time_range)} itemToString={(item:any)=>item?.text??''} selectedItem={toItems(dropdownOptions.time_range).find(x=>x.id===formValues.time_range)??null} onChange={({selectedItem}:any)=>{setFormValues(v=>({...v,time_range:selectedItem?.id??''}));setProfile(null);}}/></div>
      </div>
     </AccordionItem>
     <AccordionItem title={<span className="research-accordion-title"><b>02</b> 产品与竞品画像 <small>产品属性、品牌、价格与竞争对手</small></span>} open={openPanels[1]} onHeadingClick={({isOpen}:any)=>setOpenPanels(v=>v.map((x,i)=>i===1?!isOpen:x))}>
      <div className="research-fluid-grid">
       <div className="research-fluid-field"><FluidComboBox id="intake-category" titleText="产品类别" label="搜索或输入产品类别" placeholder="搜索或输入自定义类别" items={toItems(categoryOptions)} itemToString={(item:any)=>item?.text??''} selectedItem={toItems(categoryOptions).find(x=>x.id===formValues.product_categories)??null} allowCustomValue onChange={(data:any)=>{setFormValues(v=>({...v,product_categories:data.selectedItem?.text??data.inputValue??''}));setProfile(null);}}/></div>
       <div className="research-fluid-field"><FluidTextInput id="intake-attributes" labelText="产品属性与规格" value={formValues.product_attributes??''} placeholder="材质、尺寸、容量、功能、连接方式等" onChange={(e:any)=>{setFormValues(v=>({...v,product_attributes:e.target.value}));setProfile(null);}}/></div>
       <div className="research-fluid-field"><FluidTextInput id="intake-brands" labelText="品牌" value={formValues.brands??''} placeholder="输入品牌名称" onChange={(e:any)=>{setFormValues(v=>({...v,brands:e.target.value}));setProfile(null);}}/></div>
       <div className="research-fluid-field research-fluid-span"><FluidTextArea id="intake-models" labelText="型号 / SKU / UPC / EAN" helperText="支持多行输入，每行填写一个型号或商品标识符。" rows={3} value={formValues.models_identifiers??''} onChange={(e:any)=>{setFormValues(v=>({...v,models_identifiers:e.target.value}));setProfile(null);}}/></div>
       <div className="research-fluid-field research-fluid-span"><label className="cds--label">价格范围与币种</label><div className="research-price-range">
        <FluidNumberInput id="intake-price-min" label="最低价格" min={0} step={1} value={formValues.price_min??''} onChange={(e:any)=>{setFormValues(v=>({...v,price_min:e.target.value,price_range:formatPriceRange(e.target.value,v.price_max,v.price_currency)}));setProfile(null);}}/>
        <FluidNumberInput id="intake-price-max" label="最高价格" min={0} step={1} value={formValues.price_max??''} onChange={(e:any)=>{setFormValues(v=>({...v,price_max:e.target.value,price_range:formatPriceRange(v.price_min,e.target.value,v.price_currency)}));setProfile(null);}}/>
        <FluidDropdown id="intake-price-currency" titleText="币种" label="币种" items={toItems(['USD','EUR','CNY'])} itemToString={(item:any)=>item?.text??''} selectedItem={toItems(['USD','EUR','CNY']).find(x=>x.id===(formValues.price_currency??'USD'))??toItems(['USD','EUR','CNY'])[0]} onChange={({selectedItem}:any)=>{setFormValues(v=>({...v,price_currency:selectedItem?.id??'USD',price_range:formatPriceRange(v.price_min,v.price_max,selectedItem?.id??'USD')}));setProfile(null);}}/>
       </div></div>
       <div className="research-fluid-field research-fluid-span"><FluidTextArea id="intake-competitors" labelText="竞争对手" helperText="可按回车换行，也可使用逗号分隔品牌或企业名称。" rows={3} value={formValues.competitors??''} onChange={(e:any)=>{setFormValues(v=>({...v,competitors:e.target.value}));setProfile(null);}}/></div>
      </div>
     </AccordionItem>
     <AccordionItem title={<span className="research-accordion-title"><b>03</b> 市场与渠道受众 <small>目标客户、销售渠道与参考来源</small></span>} open={openPanels[2]} onHeadingClick={({isOpen}:any)=>setOpenPanels(v=>v.map((x,i)=>i===2?!isOpen:x))}>
      <div className="research-fluid-grid">
       <div className="research-fluid-field research-fluid-span"><FluidTextInput id="intake-customers" labelText="目标客户群体" value={formValues.target_customers??''} placeholder="例如：养猫家庭、宠物店、年轻上班族" onChange={(e:any)=>{setFormValues(v=>({...v,target_customers:e.target.value}));setProfile(null);}}/></div>
       <div className="research-fluid-field research-fluid-span"><FluidMultiSelect id="intake-sales-channels" titleText="销售渠道" label="搜索并选择销售渠道" items={toItems(channelOptions)} itemToString={(item:any)=>item?.text??''} selectedItems={toItems(splitValues(formValues.sales_channels??''))} onChange={({selectedItems}:any)=>{setFormValues(v=>({...v,sales_channels:(selectedItems??[]).map((x:any)=>x.id).join(', ')}));setProfile(null);}} selectionFeedback="top-after-reopen"/></div>
       <div className="research-fluid-field research-fluid-span"><FluidTextArea id="intake-urls" labelText="参考 URL / 社交账号" helperText="每行填写一个网址或社交账号链接。" rows={4} value={formValues.reference_urls??''} placeholder="https://example.com/product" onChange={(e:any)=>{setFormValues(v=>({...v,reference_urls:e.target.value}));setProfile(null);}}/></div>
      </div>
     </AccordionItem>
     <AccordionItem title={<span className="research-accordion-title"><b>04</b> 供应链与高级设定 <small>供应链、合规、物流和商业目标</small></span>} open={openPanels[3]} onHeadingClick={({isOpen}:any)=>setOpenPanels(v=>v.map((x,i)=>i===3?!isOpen:x))}>
      <div className="research-fluid-grid">
       <div className="research-fluid-field"><FluidComboBox id="intake-origin" titleText="原产地 / 供应链市场" label="搜索或输入供应链市场" placeholder="搜索或输入国家 / 地区" items={toItems(supplyOptions)} itemToString={(item:any)=>item?.text??''} selectedItem={toItems(supplyOptions).find(x=>x.id===formValues.origin_supply_markets)??null} allowCustomValue onChange={(data:any)=>{setFormValues(v=>({...v,origin_supply_markets:data.selectedItem?.text??data.inputValue??''}));setProfile(null);}}/></div>
       <div className="research-fluid-field"><FluidMultiSelect id="intake-certifications" titleText="认证与合规要求" label="选择认证标准" items={toItems(complianceOptions)} itemToString={(item:any)=>item?.text??''} selectedItems={toItems(splitValues(formValues.certifications??''))} onChange={({selectedItems}:any)=>{setFormValues(v=>({...v,certifications:selectedItems.map((x:any)=>x.id).join(', ')}));setProfile(null);}}/></div>
       <div className="research-fluid-field"><FluidTextInput id="intake-usage" labelText="使用场景" value={formValues.usage_scenarios??''} placeholder="描述典型使用情境" onChange={(e:any)=>{setFormValues(v=>({...v,usage_scenarios:e.target.value}));setProfile(null);}}/></div>
       <div className="research-fluid-field"><FluidMultiSelect id="intake-logistics" titleText="包装与物流属性" label="选择物流属性" items={toItems(logisticsOptions)} itemToString={(item:any)=>item?.text??''} selectedItems={toItems(splitValues(formValues.logistics_attributes??''))} onChange={({selectedItems}:any)=>{setFormValues(v=>({...v,logistics_attributes:selectedItems.map((x:any)=>x.id).join(', ')}));setProfile(null);}}/></div>
       <div className="research-fluid-field"><FluidTextInput id="intake-exclusions" labelText="排除条件" value={formValues.exclusions??''} placeholder="例如：排除二手商品、低评分商品" onChange={(e:any)=>{setFormValues(v=>({...v,exclusions:e.target.value}));setProfile(null);}}/></div>
       <div className="research-fluid-field"><FluidTextInput id="intake-purchase" labelText="采购数量与成本要求" value={formValues.purchase_requirements??''} placeholder="例如：首单 500 件，目标 FOB 成本" onChange={(e:any)=>{setFormValues(v=>({...v,purchase_requirements:e.target.value}));setProfile(null);}}/></div>
       <div className="research-fluid-field research-fluid-span"><FormGroup legendText="商业目标与研究问题"><RadioButtonGroup name="business-goal" value={formValues.business_goals??''} onChange={(value:string|number|undefined)=>{setFormValues(v=>({...v,business_goals:String(value??'')}));setProfile(null);}}><div className="research-radio-grid">{goalOptions.map(option=><RadioButton key={option} id={'goal-'+option} value={option} labelText={option}/>)}</div></RadioButtonGroup></FormGroup></div>
       <div className="research-fluid-field"><FluidTextInput id="intake-constraints" labelText="其他约束条件" value={formValues.other_constraints??''} placeholder="填写研究限制条件" onChange={(e:any)=>{setFormValues(v=>({...v,other_constraints:e.target.value}));setProfile(null);}}/></div>
       <div className="research-fluid-field research-fluid-span"><FluidTextArea id="intake-other-notes" labelText="其他研究说明 / 自然语言补充" helperText="可补充研究背景、优先级、假设、关注的问题和希望 AI 特别分析的内容。" rows={6} value={brief||formValues.other_research_notes||''} onChange={(e:any)=>{setBrief(e.target.value);setProfile(null);}}/></div>
      </div>
     <div className="research-ai-parse-action"><div><b>AI 需求整理</b><p>将已填写内容解析为结构化研究画像，并标记用户信息、AI 建议与待确认项。</p></div><Button kind="secondary" renderIcon={Renew} disabled={busy||(!brief.trim()&&!Object.values(formValues).some(value=>value.trim()))} onClick={()=>void parseBrief()}>AI 整理研究需求</Button></div>
      </AccordionItem>
    </Accordion>
   </FluidForm>
   {parseError&&<p className="error-text">{parseError}</p>}
  </Tile>
  {profile&&<Tile className="research-profile-tile">
   <div className="module-heading"><div><p className="eyebrow">AI STRUCTURED RESEARCH PROFILE</p><h2>检查并确认研究条件</h2><p>{profile.summary}</p></div><Tag type="green">解析完成</Tag></div>
   <div className="research-profile-stats"><Tag type="green">{confirmedCount} 项已明确</Tag><Tag type="blue">{suggestedCount} 项 AI 建议</Tag><Tag type="warm-gray">{missingCount} 项待补充</Tag></div>
   <p className="research-profile-hint">绿色是用户提供或确认的信息；蓝色是 AI 建议；灰色是待补充。修改为空的字段会重新标记为待补充。</p>
   {dimensionGroups.map(group=><div className="research-dimension-group" key={group.title}><div><h3>{group.title}</h3><p>{group.description}</p></div><div className="research-dimension-grid">
    {profile.dimensions.filter(item=>group.keys.includes(item.key)).map(item=><div className="research-dimension" key={item.key}><div className="research-dimension-heading"><b>{item.label}</b><Tag type={statusType[item.status]}>{statusLabel[item.status]}</Tag></div><TextArea id={'dimension-'+item.key} labelText={item.label} hideLabel rows={2} value={item.values.join('\n')} placeholder="未提供，可留空或补充" onChange={e=>updateDimension(item.key,e.target.value)}/>{item.note&&<small>{item.note}</small>}</div>)}
   </div></div>)}
   {profile.dimensions.some(item=>!dimensionGroups.some(group=>group.keys.includes(item.key)))&&<div className="research-dimension-group"><h3>其他补充维度</h3><div className="research-dimension-grid">{profile.dimensions.filter(item=>!dimensionGroups.some(group=>group.keys.includes(item.key))).map(item=><div className="research-dimension" key={item.key}><div className="research-dimension-heading"><b>{item.label}</b><Tag type={statusType[item.status]}>{statusLabel[item.status]}</Tag></div><TextArea id={'dimension-'+item.key} labelText={item.label} hideLabel rows={2} value={item.values.join('\n')} onChange={e=>updateDimension(item.key,e.target.value)}/></div>)}</div></div>}
   <div className="research-dimension-group"><h3>添加自定义研究维度</h3><div className="research-custom-dimension"><TextInput id="custom-dimension-label" labelText="维度名称" value={customLabel} onChange={e=>setCustomLabel(e.target.value)} placeholder="例如：认证要求"/><TextInput id="custom-dimension-value" labelText="维度内容" value={customValue} onChange={e=>setCustomValue(e.target.value)} placeholder="例如：CE、RoHS"/><Button kind="tertiary" renderIcon={Add} disabled={!customLabel.trim()||!customValue.trim()} onClick={addCustomDimension}>添加维度</Button></div></div>
   <div className="research-dimension-group"><h3>研究目标</h3><TextArea id="research-goals" labelText="研究目标" rows={3} value={profile.research_goals.join('\n')} onChange={e=>setProfile({...profile,research_goals:splitValues(e.target.value)})}/></div>
   {profile.assumptions.length>0&&<div className="research-profile-notes"><b>AI 推断与假设（请留意）</b>{profile.assumptions.map((item,index)=><p key={index}>{item}</p>)}</div>}
   {profile.missing_information.length>0&&<div className="research-profile-notes"><b>尚未明确的信息</b>{profile.missing_information.map((item,index)=><p key={index}>{item}</p>)}</div>}
   <div className="research-profile-hint">研究条件已整理完成。点击底部「下一步」保存并进入调研平台选择。</div>
  </Tile>}

  <div className="research-step-footer research-workflow-actions research-intake-actions">
   <Button className="research-workflow-button" kind="secondary" disabled>上一步</Button>
   <Button className="research-workflow-button" kind="primary" disabled={busy||!requiredReady} onClick={proceedToSources}>下一步：调研平台 <ArrowRight size={16}/></Button>
  </div>
  <div className="module-heading"><div><h2>我的研究项目</h2><p>每项研究都保留需求、采集、统计与报告记录。</p></div><Tag type="blue">{projects.length} 个项目</Tag></div>
  <div className="project-card-grid">{projects.map(item=><Tile key={item.id} className="list-tile"><div><h3>{item.name}</h3><p>{item.objective}</p><Tag type={item.status==='completed'?'green':'blue'}>{item.status}</Tag></div><Button kind="ghost" renderIcon={ArrowRight} onClick={()=>onOpen(item.id)}>打开研究工作区</Button></Tile>)}</div>
  {!projects.length&&<Tile><p>还没有研究项目。填写上方研究需求即可开始。</p></Tile>}

  </section>;

 const savedProfile=project.scope?.research_profile as ResearchProfile|undefined;
 const selectedPlanSources=Array.from(new Set(selectedSources.filter(source=>sourceGroups.some(group=>group.items.includes(source)))));
 const completedCount=projectTasks.filter(t=>t.status==='succeeded'&&Number(t.result_synced_count??0)>=Number(t.result_count??0)).length;
 const taskEvents=projectTasks.flatMap(task=>[
  {time:task.created_at,label:task.platform_slug+' 任务已创建',detail:'等待执行'},
  ...(task.started_at?[{time:task.started_at,label:task.platform_slug+' 开始运行',detail:task.run_status??'Apify Run'}]:[]),
  ...(task.finished_at?[{time:task.finished_at,label:task.platform_slug+' 运行结束',detail:task.status+(task.error_message?' · '+task.error_message:'')}]:[]),
  ...(Number(task.result_synced_count??0)>0?[{time:task.updated_at??task.finished_at??task.created_at,label:task.platform_slug+' 数据同步进度',detail:(task.result_synced_count??0)+' / '+(task.result_count??0)+' 条'}]:[]),
 ]).sort((a,b)=>new Date(b.time).getTime()-new Date(a.time).getTime()).slice(0,30);
 const statsSavedForAllTasks=projectTasks.length>0&&projectTasks.every(task=>projectReports.some(report=>report.report_type==='dataset_analytics'&&report.evidence?.some(item=>item.task_id===task.id)));
 const analyticsSavedForCurrentTask=Boolean(analyticsTaskId&&projectReports.some(report=>report.report_type==='dataset_analytics'&&report.evidence?.some(item=>item.task_id===analyticsTaskId)));
 const stepReady=[true,true,projectTasks.length>0,allSynced,statsSavedForAllTasks];
 let maxUnlockedStep=0; for(let index=1;index<stepReady.length;index++){if(!stepReady[index])break;maxUnlockedStep=index;}
 return <section className="module-stack research-workspace research-fullwidth">
  <div className="research-detail-heading"><Button kind="ghost" renderIcon={ArrowLeft} onClick={onBack}>全部研究</Button><div><p className="eyebrow">RESEARCH PROJECT WORKSPACE</p><h2>{project.name}</h2><p>{savedProfile?.summary??project.objective}</p></div><Tag type={project.status==='completed'?'green':'blue'}>{project.status}</Tag></div>
  <ResearchProgress activeStep={activeStep} maxUnlockedStep={maxUnlockedStep} stepReady={stepReady}/>
  {activeStep===0&&<Tile><div className="module-heading"><div><h3>第一步 · 已确认的研究需求</h3><p>查看第一步保存的结构化画像。修改需求时应重新评估后续采集计划。</p></div><Tag type="green">已保存</Tag></div><p>{savedProfile?.summary??project.objective}</p>{savedProfile?.dimensions.filter(item=>item.values.length).map(item=><div className="research-saved-row" key={item.key}><b>{item.label} <Tag type={statusType[item.status]}>{statusLabel[item.status]}</Tag></b><p>{item.values.join(' · ')}</p></div>)}{!savedProfile&&<p>{project.objective}</p>}</Tile>}
  {activeStep===1&&<Tile className="research-source-tile"><div className="module-heading"><div><p className="eyebrow">STEP 2 / DATA SOURCE MARKETPLACE</p><h3>选择调研平台与数据类别</h3><p>先选择需要覆盖的数据类别和具体平台。Synesis 将据此搜索 Apify Store 中真实存在且有输入 Schema 的 Actor。</p></div>{plan?<Tag type="green">平台方案已生成</Tag>:<Tag type="blue">待选择</Tag>}</div>
   <div className="research-platform-picker">
    <section className="research-selected-platforms" aria-label="已选择的平台">
     <div className="research-selected-heading"><div><h4>已选择的平台</h4><p>跨分类自由组合；切换分类不会清除已选平台。</p></div><div className="research-selected-actions"><Tag type={selectedPlanSources.length?'blue':'gray'}>{selectedPlanSources.length} 个平台</Tag><Button kind="ghost" size="sm" disabled={!selectedPlanSources.length||busy} onClick={()=>setSelectedSources([])}>清空选择</Button></div></div>
     {selectedPlanSources.length>0?<div className="research-selected-tags">{Array.from(new Set(selectedPlanSources)).map(platform=><Tag key={platform} type="blue" filter onClose={()=>setSelectedSources(values=>values.filter(value=>value!==platform))}>{platform}</Tag>)}</div>:<p className="research-selected-empty">尚未选择平台。请在下方分类中勾选一个或多个数据来源。</p>}
    </section>
    <Tabs selectedIndex={activeSourceTab} onChange={({selectedIndex}:any)=>setActiveSourceTab(selectedIndex)} className="research-platform-tabs">
     <TabList aria-label="调研平台分类" contained>
      {sourceGroups.map(group=><Tab key={group.id}>{group.title}</Tab>)}
     </TabList>
     <TabPanels>
      {sourceGroups.map(group=><TabPanel key={group.id}>
       <div className="research-platform-category-heading"><div><h4>{group.title}</h4><p>{group.desc}</p></div><Tag type="cool-gray">{group.items.length} 个来源</Tag></div>
       <div className="research-platform-options">
        {group.items.map((platform,platformIndex)=><div className="research-platform-option" key={platform}>
         <Checkbox id={'source-'+group.id+'-'+platformIndex} labelText={platform} checked={selectedPlanSources.includes(platform)} onChange={(_,data)=>setSelectedSources(values=>data.checked?(values.includes(platform)?values:[...values,platform]):values.filter(value=>value!==platform))}/>
         {asiaPlatformNames.has(platform)&&<Tag type="purple">中国 / 亚洲</Tag>}
        </div>)}
       </div>
      </TabPanel>)}
     </TabPanels>
    </Tabs>
   </div>
   {plan&&<><div className="research-actor-candidates"><h4>Apify Store 发现的候选 Actor</h4>{(Array.isArray(plan.plan.actor_candidates)?plan.plan.actor_candidates:[]).map((actor:any,index:number)=><div className="research-actor-card" key={String(actor.id??index)}><div><b>{String(actor.title??actor.name??actor.id??'Apify Actor')}</b><p>{String(actor.description??'暂无描述')}</p><small>{Array.isArray(actor.categories)?actor.categories.join(' · '):'Apify Store 候选'} · {String(actor.pricing_model??'计费方式未提供')}{actor.rating?' · 评分 '+actor.rating:''}</small></div></div>)}</div><div className="research-plan-meta"><span>发现候选 Actor：{Array.isArray(plan.plan.actor_candidates)?plan.plan.actor_candidates.length:0}</span><span>拟执行任务：{proposedTasks.length}</span><span>预计费用（AI 估算）：{plan.estimated_cost===null?'暂不可估算':'$ '+Number(plan.estimated_cost).toFixed(2)}</span></div><p>{String(plan.plan.executive_summary??'AI 已生成调研平台方案。')}</p><div className="research-plan-list">{proposedTasks.map((task:any,index:number)=><div className="research-plan-row" key={index}><div><b>{String(task.platform_slug??'平台')} · {String(task.actor_title??'待选择 Actor')}</b><p>{String(task.purpose??task.description??'按研究目标采集')}</p><p>目标记录：{task.estimated_items??'未估算'} · 深度：{task.collection_depth==='deep'?'深度':task.collection_depth==='light'?'快速':'标准'} · 计费：{String(task.pricing_model??'未提供')}{task.actor_rating?' · 评分 '+task.actor_rating:''}</p>{task.schema_valid?<Tag type="green">输入参数已校验</Tag>:<Tag type="warm-gray">参数待调整</Tag>}{(task.validation_errors??[]).map((error:string)=><p key={error}>{error}</p>)}{(task.settings_warnings??[]).map((warning:string)=><p className="research-settings-warning" key={warning}>{warning}</p>)}</div></div>)}</div><div className="research-start-actions"><span>可以修改上方平台勾选，再按当前选择重新搜索候选 Actor。</span><Button kind="tertiary" disabled={!selectedPlanSources.length||busy} onClick={()=>onGeneratePlan(project,selectedPlanSources)}>按当前选择重新生成方案</Button></div><div className="research-approval"><p>{actorsReady?'所有拟执行任务均已匹配真实 Apify Actor，并通过输入 Schema 校验。批准后将开始抓取。':'部分任务未找到可执行的真实 Actor 或未通过 Schema 校验，不能批准执行。可调整平台选择后重新生成。'}</p><Button kind="primary" disabled={!actorsReady||busy||plan.status!=='pending_approval'} onClick={()=>onApprove(plan)}>确认平台方案并开始抓取</Button></div></>}
   {!plan&&<div className="research-start-actions"><span>选择一个或多个分类 / 平台。实际 Actor 以 Apify Store 搜索结果为准。</span><Button kind="primary" disabled={!selectedPlanSources.length||busy} onClick={()=>onGeneratePlan(project,selectedPlanSources)}>搜索 Apify 平台并生成方案 <ArrowRight size={16}/></Button></div>}
  </Tile>}
  {activeStep===2&&<Tile><div className="module-heading"><div><p className="eyebrow">STEP 3 / COLLECTION MONITOR</p><h3>数据抓取与动态运行状态</h3><p>状态每 12 秒自动刷新；Apify Run 完成后继续同步 Dataset，直至所有结果写入数据库。</p></div><Tag type={allSynced?'green':'blue'}>{allSynced?'全部同步完成':'采集进行中'}</Tag></div>
   <div className="research-run-kpis"><div><strong>{projectTasks.length}</strong><span>采集任务</span></div><div><strong>{completedCount}</strong><span>同步完成</span></div><div><strong>{synced.toLocaleString()}</strong><span>已同步记录</span></div><div><strong>{expected.toLocaleString()}</strong><span>预期记录</span></div></div>
   {projectTasks.map(task=><div className="research-task-row" key={task.id}><div><b>{task.platform_slug}</b><p>{task.status} · Apify {task.run_status??'等待运行'} · {Number(task.result_synced_count??0).toLocaleString()} / {Number(task.result_count??0).toLocaleString()}</p>{task.error_message&&<p className="error-text">{task.error_message}</p>}{task.external_run_id&&<div className="research-live-log"><div><b>Apify 实时运行日志</b><Button size="sm" kind="ghost" onClick={()=>onLoadLogs(task)}>刷新日志</Button></div><pre>{(taskLogs[task.id]??[]).join('\n')||'正在等待 Apify 输出日志…'}</pre></div>}</div><div className="card-actions">{task.status==='failed'&&<Button size="sm" kind="tertiary" renderIcon={Renew} onClick={()=>onRetry(task)}>重试</Button>}{(['queued','running'].includes(task.status)||(task.status==='succeeded'&&Number(task.result_synced_count??0)<Number(task.result_count??0)))&&<Button size="sm" kind="ghost" renderIcon={Renew} onClick={()=>onSync(task)}>同步 / 刷新</Button>}{['queued','running'].includes(task.status)&&<Button size="sm" kind="danger--tertiary" onClick={()=>onCancel(task)}>取消</Button>}{task.status==='succeeded'&&<Button size="sm" kind="ghost" onClick={()=>onView(task)}>查看结果</Button>}</div></div>)}
   <div className="research-dimension-group"><h4>动态运行事件</h4>{taskEvents.length?taskEvents.map((event,index)=><div className="research-event-row" key={index}><time>{new Date(event.time).toLocaleString()}</time><b>{event.label}</b><span>{event.detail}</span></div>):<p className="research-profile-hint">尚无采集事件。完成第二步平台选择并批准后，运行状态将在这里显示。</p>}</div>
   {allSynced&&<Button kind="primary" onClick={()=>setActiveStep(3)}>数据已同步，进入统计分析 <ArrowRight size={16}/></Button>}
  </Tile>}
  {activeStep===3&&<Tile><div className="module-heading"><div><p className="eyebrow">STEP 4 / BUSINESS INTELLIGENCE</p><h3>跨平台数据整理与统计分析</h3><p>先将不同平台的同类字段统一映射，再按数据源查看平台专属统计；原始记录始终独立保留。</p></div><Tag type={allSynced?'green':projectTasks.length?'warm-gray':'blue'}>{allSynced?'数据已就绪':projectTasks.length?'部分数据同步中':'等待采集结果'}</Tag></div>
   <div className="research-run-kpis"><div><strong>{projectTasks.length}</strong><span>数据来源</span></div><div><strong>{Number(projectResultTotal??0).toLocaleString()}</strong><span>已汇总记录</span></div><div><strong>{projectTasks.reduce((sum,task)=>sum+Number(task.result_synced_count??0),0).toLocaleString()}</strong><span>已同步记录</span></div><div><strong>{projectTasks.filter(task=>task.status==='succeeded').length}</strong><span>完成平台</span></div></div>
   {projectTasks.map(task=><div className="research-task-row" key={task.id}><div><b>{task.platform_slug}</b><p>{Number(task.result_synced_count??0).toLocaleString()} / {Number(task.result_count??0).toLocaleString()} 条已同步</p></div><Button size="sm" kind="tertiary" renderIcon={ChartLine} disabled={busy||task.status!=='succeeded'||Number(task.result_synced_count??0)<Number(task.result_count??0)} onClick={()=>onAnalyze(task)}>生成该数据源统计</Button></div>)}
   <section className="cross-platform-dataset"><div className="cross-platform-dataset-heading"><div><h4>跨平台统一数据集</h4><p>把商品、内容、企业、职位、新闻等来源映射到统一字段，便于横向检索和比较。</p></div><Tag type="blue">{Number(projectResultTotal??0).toLocaleString()} 条</Tag></div>
    <CrossPlatformResultsTable rows={projectResultRows??[]}/>
    <div className="cross-platform-dataset-pagination"><span>显示第 {projectResultTotal?projectResultOffset+1:0}–{Math.min(projectResultOffset+(projectResultRows?.length??0),projectResultTotal??0)} 条，共 {Number(projectResultTotal??0).toLocaleString()} 条</span><div><Button size="sm" kind="tertiary" disabled={projectResultOffset<=0||busy} onClick={()=>projectId&&onLoadProjectResults(projectId,Math.max(0,projectResultOffset-100))}>上一页</Button><Button size="sm" kind="tertiary" disabled={projectResultOffset+100>=Number(projectResultTotal??0)||busy} onClick={()=>projectId&&onLoadProjectResults(projectId,projectResultOffset+100)}>下一页</Button><Button size="sm" kind="ghost" onClick={()=>projectId&&onLoadProjectResults(projectId,projectResultOffset)} disabled={busy}>刷新</Button></div></div>
   </section>
   {analytics&&analyticsTaskId&&projectTasks.some(task=>task.id===analyticsTaskId)&&<ResearchAnalyticsView data={analytics}/>}{analytics&&analyticsTaskId&&projectTasks.some(task=>task.id===analyticsTaskId)&&<div className="research-analytics-save"><span>{analyticsSavedForCurrentTask?"该数据源统计快照已保存。":"保存该数据源的统计快照后，才能进入第五步。"}</span><Button kind="primary" disabled={busy||analyticsSavedForCurrentTask} onClick={onSaveAnalytics}>保存统计快照</Button></div>}
   <p className="research-profile-hint">通用数据集只映射真实存在的共性字段，不会将不同业务含义的数据强行合并；平台专属字段和完整嵌套数据仍可在第三步的原始结果中查看。</p>
   {!projectTasks.length&&<p>尚无采集结果，请先完成第二、三步。</p>}
  </Tile>}
  {activeStep===4&&<Tile><div className="module-heading"><div><p className="eyebrow">STEP 5 / AI STRATEGY & REPORT</p><h3>AI 深度分析与商业策略报告</h3><p>基于已同步数据和统计结果，形成可追溯的市场研究报告。</p></div><Tag type={projectReports.length?'green':'blue'}>{projectReports.length?'报告已保存':'等待分析'}</Tag></div>
   <div className="research-report-topics"><span>产品开发策略</span><span>定价策略</span><span>目标市场策略</span><span>消费者人群策略</span><span>竞争策略</span><span>营销与渠道策略</span><span>风险与行动计划</span></div>
   {projectReports.map(report=><div className="research-saved-report" key={report.id}><div className="report-row"><div><strong>{report.title}</strong><p>{new Date(report.created_at).toLocaleString()} · {report.status}</p></div><Tag type="green">已保存</Tag></div><details><summary>查看报告内容</summary><pre className="result-json">{JSON.stringify(report.content,null,2)}</pre></details></div>)}
   {!projectReports.some(report=>report.report_type==="market_research")&&<div className="research-ai-report-action"><p>{statsSavedForAllTasks?"第五步已就绪。AI 将综合全部采集数据与第四步保存的统计快照，生成产品、定价、市场、人群、竞争和营销策略。":"请先在第四步为每个采集任务生成并保存统计快照。完成后即可启动 AI 深度分析。"}</p><Button kind="primary" disabled={busy||!statsSavedForAllTasks} onClick={()=>onGenerateReport(project.id)}>开始 AI 深度分析并保存报告方案</Button></div>}
  </Tile>}
  <div className="research-step-footer research-workflow-actions">
   <Button className="research-workflow-button" kind="tertiary" disabled={activeStep===0} onClick={()=>setActiveStep(v=>Math.max(0,v-1))}>上一步</Button>
   <div className="research-workflow-spacer"/>
   <Button className="research-workflow-button" kind="danger--ghost" disabled={busy} onClick={onBack}>取消</Button>
   <Button className="research-workflow-button" kind="tertiary" disabled={busy} onClick={()=>onSaveDraft({brief:project.objective,formValues,profile:savedProfile??null,activeStep,selectedSources},project.id)}>暂存</Button>
   <Button className="research-workflow-button" kind="primary" disabled={activeStep===4||!stepReady[activeStep+1]} onClick={()=>setActiveStep(v=>Math.min(4,v+1))}>下一步</Button>
  </div>
 </section>;
}
