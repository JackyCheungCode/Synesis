import { Button, Tag, Tile } from '@carbon/react';
import { Add } from '@carbon/icons-react';

type Props={projectCount:number;pendingPlanCount:number;taskCount:number;credentialCount:number;onCreateResearch:()=>void};
export function WorkspaceDashboard({projectCount,pendingPlanCount,taskCount,credentialCount,onCreateResearch}:Props) {
  return <div className="carbon-grid">
    <Tile><div className="metric-label">研究项目</div><div className="metric-value">{projectCount}</div><p>已建立的研究项目</p></Tile>
    <Tile><div className="metric-label">待审批研究计划</div><div className="metric-value">{pendingPlanCount}</div><p>人工批准前不会启动采集</p></Tile>
    <Tile><div className="metric-label">采集任务</div><div className="metric-value">{taskCount}</div><p>Apify 任务运行记录</p></Tile>
    <Tile><div className="metric-label">已配置凭证</div><div className="metric-value">{credentialCount}</div><p>密钥仅在后端加密保存</p></Tile>
    <Tile className="wide-tile"><h3>研究流程</h3><div className="flow-steps"><Tag type="blue">输入需求</Tag><span>→</span><Tag type="blue">Apify 计划</Tag><span>→</span><Tag type="warm-gray">采集前审批</Tag><span>→</span><Tag type="cool-gray">自动汇总</Tag><span>→</span><Tag type="cool-gray">AI 报告</Tag></div><p>只有明确批准的研究计划才能启动采集；批准后同步和分析自动推进。</p><Button kind="primary" renderIcon={Add} onClick={onCreateResearch}>开始新研究</Button></Tile>
  </div>;
}
