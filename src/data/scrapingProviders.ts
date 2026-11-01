export type ScrapingProviderId = 'apify'|'brightdata'|'octoparse'|'firecrawl'|'phantombuster'|'texau';
export type ScrapingCapability = 'actor_marketplace'|'actor_schema'|'web_scraper'|'serp'|'web_unlocker'|'browser'|'cloud_tasks'|'agent_automation'|'web_crawl'|'structured_extract'|'lead_enrichment'|'contact_verification'|'mcp';
export type ScrapingProvider = { id:ScrapingProviderId; name:string; description:string; capabilities:ScrapingCapability[]; inputMode:'dynamic_schema'|'task_template'|'url_request'|'agent_argument'|'endpoint_schema'; docs:string; supportsAsync:boolean; supportsCancel:boolean };
export const scrapingProviders:ScrapingProvider[] = [
 {id:'apify',name:'Apify',description:'Actor 市场、动态 Input Schema、运行与 Dataset',capabilities:['actor_marketplace','actor_schema','web_scraper','web_crawl'],inputMode:'dynamic_schema',docs:'https://docs.apify.com/api',supportsAsync:true,supportsCancel:true},
 {id:'brightdata',name:'Bright Data',description:'Web Scraper、SERP、Web Unlocker、Scraping Browser',capabilities:['web_scraper','serp','web_unlocker','browser'],inputMode:'endpoint_schema',docs:'https://docs.brightdata.com/',supportsAsync:true,supportsCancel:false},
 {id:'octoparse',name:'Octoparse',description:'管理已有云端任务、监控执行和导出数据',capabilities:['cloud_tasks','web_scraper'],inputMode:'task_template',docs:'https://openapi.octoparse.com/zh-CN/',supportsAsync:true,supportsCancel:true},
 {id:'firecrawl',name:'Firecrawl',description:'Search、Scrape、Crawl、Extract',capabilities:['web_scraper','web_crawl','structured_extract','mcp'],inputMode:'url_request',docs:'https://docs.firecrawl.dev/',supportsAsync:true,supportsCancel:true},
 {id:'phantombuster',name:'PhantomBuster',description:'用户已有 Agent 的发现、启动、监控和结果获取',capabilities:['agent_automation','web_scraper'],inputMode:'agent_argument',docs:'https://hub.phantombuster.com/docs/api',supportsAsync:true,supportsCancel:true},
 {id:'texau',name:'TexAu',description:'潜客搜索、公司与个人资料丰富、邮箱电话查找验证',capabilities:['lead_enrichment','contact_verification','web_scraper','mcp'],inputMode:'endpoint_schema',docs:'https://www.texau.com/api-platform',supportsAsync:true,supportsCancel:false},
];
export function getScrapingProvider(id:string){return scrapingProviders.find(provider=>provider.id===id);}
