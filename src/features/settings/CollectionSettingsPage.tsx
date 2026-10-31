import { Button, NumberInput, RadioButton, RadioButtonGroup, Tag, Tile } from '@carbon/react';
import { Save } from '@carbon/icons-react';

export type CollectionSettings = {
  itemsPerPlatform: number;
  depth: 'light' | 'standard' | 'deep';
};

type Props = {
  settings: CollectionSettings;
  onChange: (settings: CollectionSettings) => void;
  onSave: () => void;
  saving?: boolean;
};

const depthOptions = [
  { value: 'light', label: '快速采集', description: '优先获取列表和核心字段，尽量减少运行时间与费用。' },
  { value: 'standard', label: '标准采集', description: '采集核心字段及平台可提供的关键互动、评分和基础详情。' },
  { value: 'deep', label: '深度采集', description: '在 Actor 支持的前提下扩展详情页、评论和关联信息，成本与耗时更高。' },
] as const;

export function CollectionSettingsPage({ settings, onChange, onSave, saving = false }: Props) {
  return <section className="module-stack collection-settings-page">
    <div className="module-heading">
      <div><p className="eyebrow">WORKSPACE / RESEARCH PREFERENCES</p><h2>调研采集设置</h2><p>设置新建调研任务默认采用的采集深度和每个平台的数据返回数量。保存后应用于后续生成的采集方案。</p></div>
      <Tag type="blue">默认采集策略</Tag>
    </div>
    <Tile className="collection-setting-card">
      <div className="collection-setting-heading"><div><h3>每个平台返回数量</h3><p>按平台分别生效，不是所有平台共享的总条数。商品、视频、职位、新闻等各自按一条记录计数。</p></div><Tag type="cool-gray">数量上限</Tag></div>
      <NumberInput
        id="collection-items-per-platform"
        label="每个平台的目标记录数"
        helperText="建议标准调研从 100 条开始。实际返回量可能受平台、Actor、分页和访问限制影响。"
        min={10}
        max={5000}
        step={10}
        value={settings.itemsPerPlatform}
        allowEmpty={false}
        onChange={(_, data) => {
          const parsed = Number(data.value);
          onChange({ ...settings, itemsPerPlatform: Number.isFinite(parsed) ? Math.min(5000, Math.max(10, parsed)) : 100 });
        }}
      />
      <div className="collection-count-presets" aria-label="常用返回数量">
        {[50, 100, 300, 500, 1000].map(count => <Button key={count} kind={settings.itemsPerPlatform === count ? 'primary' : 'tertiary'} size="sm" aria-pressed={settings.itemsPerPlatform === count} disabled={saving} onClick={() => onChange({ ...settings, itemsPerPlatform: count })}>{count.toLocaleString()} 条</Button>)}
      </div>
    </Tile>
    <Tile className="collection-setting-card">
      <div className="collection-setting-heading"><div><h3>默认采集深度</h3><p>控制 Actor 路由和采集方案生成时的默认数据范围。</p></div><Tag type="cool-gray">任务默认值</Tag></div>
      <RadioButtonGroup
        name="collection-depth"
        legendText="选择采集深度"
        valueSelected={settings.depth}
        onChange={(value) => onChange({ ...settings, depth: value as CollectionSettings['depth'] })}
        orientation="vertical"
      >
        {depthOptions.map(option => <RadioButton key={option.value} id={'collection-depth-'+option.value} value={option.value} labelText={option.label}/>)}
      </RadioButtonGroup>
      <div className="collection-depth-descriptions">
        {depthOptions.map(option => <div className={settings.depth === option.value ? 'is-selected' : ''} key={option.value}><b>{option.label}</b><p>{option.description}</p></div>)}
      </div>
    </Tile>
    <Tile className="collection-settings-note">
      <h3>执行说明</h3>
      <ul>
        <li>这些是新建调研任务的默认值；已经生成的采集任务不会被追溯修改。</li>
        <li>不同 Actor 的输入字段并不相同，系统会按 Actor Input Schema 将数量和深度映射到可用参数。</li>
        <li>如果某个平台不支持评论或详情扩展，系统会采集其可用字段，不会伪造缺失数据。</li>
        <li>多平台调研按“每个平台目标数量”分别分配；平台总量随所选平台数量增加。</li>
      </ul>
    </Tile>
    <div className="collection-settings-actions"><span>设置将保存到当前账户，其他设备登录后也可使用。</span><Button kind="primary" renderIcon={Save} onClick={onSave} disabled={saving} aria-busy={saving}>保存采集设置</Button></div>
  </section>;
}
