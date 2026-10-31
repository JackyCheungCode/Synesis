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
    <div className="dashboard-layout">
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
          <h2>还没有研究项目</h2>
          <p>创建一个研究项目以开始。</p>
        </div>
      )}

      <section className="dashboard-workflow" aria-labelledby="dashboard-workflow-title">
        <Tile className="dashboard-workflow-tile">
          <div className="dashboard-workflow-heading">
            <div>
              <h2 id="dashboard-workflow-title">研究流程</h2>
            </div>
            <Button kind="primary" size="lg" renderIcon={Add} onClick={onCreateResearch}>
              开始新研究
            </Button>
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
