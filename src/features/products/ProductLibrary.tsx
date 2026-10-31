import { Button, Column, Grid, InlineLoading, Link, Tag, TextInput, Tile } from '@carbon/react';
import { Renew } from '@carbon/icons-react';

type Product={id:string;canonical_key:string;title:string|null;brand:string|null;category:string|null;description:string|null;image_url:string|null;updated_at:string};
type ProductHistory={id:string;price:number;currency:string;observed_at:string;source_task_id:string;source?:{platform_slug:string;external_product_id:string;source_url:string}|null};
type Props={
  products:Product[];productTotal:number;productOffset:number;productSearch:string;setProductSearch:(value:string)=>void;busy:boolean;
  selectedProduct:Product|null;productHistory:ProductHistory[];productHistoryTotal:number;productHistoryOffset:number;
  onLoadProducts:(offset?:number,searchValue?:string)=>void;onLoadHistory:(product:Product,offset?:number)=>void;
  onSelectProduct:(product:Product|null)=>void;onClearHistory:()=>void;
};
export function ProductLibrary(props:Props) {
  const {products,productTotal,productOffset,productSearch,setProductSearch,busy,selectedProduct,productHistory,productHistoryTotal,productHistoryOffset,onLoadProducts,onLoadHistory,onSelectProduct,onClearHistory}=props;
  return <section className="module-stack" aria-label="标准化商品库">
    <Tile><div className="module-heading"><Tag type="blue">{productTotal.toLocaleString()} 件商品</Tag></div>
      {busy&&<InlineLoading description="正在更新商品数据" status="active"/>}
      <div className="product-search-row"><TextInput id="product-search" labelText="搜索商品" placeholder="商品名称、品牌或平台商品标识" value={productSearch} onChange={e=>setProductSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onLoadProducts(0,productSearch);}}/><Button kind="primary" onClick={()=>onLoadProducts(0,productSearch)} disabled={busy}>搜索</Button><Button kind="tertiary" renderIcon={Renew} onClick={()=>onLoadProducts(productOffset)} disabled={busy}>刷新</Button></div>
    </Tile>
    <Grid condensed className="product-carbon-grid">{products.map(product=><Column key={product.id} sm={4} md={4} lg={4} xlg={4}><Tile className="product-tile">
      {product.image_url&&<img className="product-image" src={product.image_url} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/>}
      <div><h3>{product.title||'未命名商品'}</h3><p>{product.brand||'品牌未知'} · {product.category||'未分类'}</p></div>
      <Button kind="tertiary" size="sm" onClick={()=>onLoadHistory(product)} disabled={busy}>查看价格历史</Button>
    </Tile></Column>)}</Grid>
    <div className="card-actions"><Button kind="secondary" size="sm" disabled={productOffset===0||busy} onClick={()=>onLoadProducts(Math.max(0,productOffset-25))}>上一页</Button><Tag type="blue">{productTotal?Math.floor(productOffset/25)+1:0} / {Math.max(1,Math.ceil(productTotal/25))}</Tag><Button kind="secondary" size="sm" disabled={productOffset+25>=productTotal||busy} onClick={()=>onLoadProducts(productOffset+25)}>下一页</Button></div>
    {selectedProduct&&<Tile className="history-tile"><div className="module-heading"><div><h2>{selectedProduct.title||'商品'} · 价格历史</h2></div><Button kind="ghost" onClick={()=>{onSelectProduct(null);onClearHistory();}} disabled={busy}>关闭</Button></div>
      {productHistory.length?<><div className="history-table-wrap"><table className="task-table"><thead><tr><th scope="col">采集时间</th><th scope="col">价格</th><th scope="col">币种</th><th scope="col">来源平台</th><th scope="col">平台商品 ID</th></tr></thead><tbody>{productHistory.map(item=><tr key={item.id}><td>{new Date(item.observed_at).toLocaleString()}</td><td>{Number(item.price).toLocaleString(undefined,{maximumFractionDigits:4})}</td><td>{item.currency}</td><td>{item.source?.platform_slug||'—'}</td><td>{item.source?.source_url?<Link href={item.source.source_url} target="_blank">{item.source.external_product_id}</Link>:item.source?.external_product_id||'—'}</td></tr>)}</tbody></table></div>
      <div className="card-actions"><Button kind="secondary" size="sm" disabled={productHistoryOffset===0||busy} onClick={()=>onLoadHistory(selectedProduct,Math.max(0,productHistoryOffset-50))}>上一页</Button><Tag>{productHistoryOffset+1}–{Math.min(productHistoryOffset+50,productHistoryTotal)} / {productHistoryTotal}</Tag><Button kind="secondary" size="sm" disabled={productHistoryOffset+50>=productHistoryTotal||busy} onClick={()=>onLoadHistory(selectedProduct,productHistoryOffset+50)}>下一页</Button></div></>:<p>暂无价格记录。</p>}
    </Tile>}
    {!products.length&&!busy&&<Tile role="status"><h2>暂无标准化商品</h2><p>完成采集并同步后，符合识别条件的商品会自动入库。</p></Tile>}
  </section>;
}
