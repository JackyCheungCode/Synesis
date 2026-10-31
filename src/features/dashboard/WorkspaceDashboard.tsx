import { Button, Column, Grid, Tile } from '@carbon/react';
import { Add } from '@carbon/icons-react';

type Props = {
  projectCount: number;
  pendingPlanCount: number;
  taskCount: number;
  credentialCount: number;
  onCreateResearch: () => void;
};

const metrics = [
  { key: 'projects', label: '研究项目', prop: 'projectCount' },
  { key: 'approvals', label: '待审批研究计划', prop: 'pendingPlanCount' },
  { key: 'tasks', label: '采集任务', prop: 'taskCount' },
  { key: 'credentials', label: '已配置凭证', prop: 'credentialCount' },
] as const;

export function WorkspaceDashboard({ projectCount, pendingPlanCount, taskCount, credentialCount, onCreateResearch }: Props) {
  const values = { projectCount, pendingPlanCount, taskCount, credentialCount };

  return (
    <div className="dashboard-layout module-stack">
      <section className="dashboard-welcome" aria-label="工作空间概览"><div><span className="dashboard-eyebrow">TRADE INTELLIGENCE WORKSPACE</span><h2>把市场信号转化为行动</h2><p>从研究需求出发，连接数据采集、分析与决策。</p></div><Button kind="primary" size="lg" renderIcon={Add} onClick={onCreateResearch}>创建研究项目</Button></section>
      <Grid condensed className="dashboard-carbon-grid" aria-label="工作空间关键指标">
        {metrics.map(metric => (
          <Column key={metric.key} sm={2} md={4} lg={4} xlg={4}><Tile className="dashboard-metric">
            <dl>
              <dt className="dashboard-metric-label">{metric.label}</dt>
              <dd className="dashboard-metric-value" aria-label={`${metric.label}：${values[metric.prop]}`}>
                {values[metric.prop].toLocaleString('zh-CN')}
              </dd>
            </dl>
          </Tile></Column>
        ))}
      </Grid>

      {projectCount === 0 && (
        <div className="dashboard-empty" role="status">
          <div className="dashboard-empty-mark" aria-hidden="true">01</div><div><h2>从第一个市场研究开始</h2><p>定义目标市场与竞品范围，Synesis 将组织采集、分析和报告流程。</p></div><Button kind="secondary" onClick={onCreateResearch}>创建研究项目</Button>
        </div>
      )}

      <section className="dashboard-workflow" aria-labelledby="dashboard-workflow-title">
        <Tile className="dashboard-workflow-tile">
          <div className="dashboard-workflow-heading">
            <div>
              <h2 id="dashboard-workflow-title">研究流程</h2>
            </div>
            <span className="dashboard-workflow-caption">从需求定义到 AI 研究报告</span>
          </div>
          <ol className="dashboard-workflow-steps">
            <li><span className="dashboard-step-index">01</span><span>输入需求</span></li>
            <li><span className="dashboard-step-index">02</span><span>生成采集计划</span></li>
            <li><span className="dashboard-step-index">03</span><span>人工审批</span></li>
            <li><span className="dashboard-step-index">04</span><span>数据汇总</span></li>
            <li><span className="dashboard-step-index">05</span><span>AI 研究报告</span></li>
          </ol>
        </Tile>
      </section>
    </div>
  );
}
