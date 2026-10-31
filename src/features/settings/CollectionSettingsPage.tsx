import { Button, Column, Grid, NumberInput, RadioButton, RadioButtonGroup, Tag, Tile } from '@carbon/react';
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
  { value: 'light', label: '快速采集', description: '列表与核心字段，成本较低。' },
  { value: 'standard', label: '标准采集', description: '核心字段及可用的互动、评分和详情。' },
  { value: 'deep', label: '深度采集', description: '扩展详情、评论和关联信息，耗时与成本较高。' },
] as const;

export function CollectionSettingsPage({ settings, onChange, onSave, saving = false }: Props) {
  return <section className="module-stack collection-settings-page" aria-label="调研采集设置">
    <header className="settings-intro"><span className="dashboard-eyebrow">WORKSPACE PREFERENCES</span><h2>定义新研究的默认采集行为</h2><p>这些设置仅应用于之后创建的研究项目，不会更改现有任务。</p></header>
    <Grid condensed className="collection-settings-carbon-grid"><Column sm={4} md={8} lg={8} xlg={8}><Tile className="collection-setting-card">
      <div className="collection-setting-heading"><div><h3>每个平台返回数量</h3><p>每个平台分别应用此数量。</p></div><Tag type="cool-gray">数量上限</Tag></div>
      <NumberInput
        id="collection-items-per-platform"
        label="每个平台的目标记录数"
        helperText="实际数量受平台和分页限制。"
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
    </Tile></Column>
    <Column sm={4} md={8} lg={8} xlg={8}><Tile className="collection-setting-card">
      <div className="collection-setting-heading"><div><h3>默认采集深度</h3><p>决定默认数据范围。</p></div><Tag type="cool-gray">任务默认值</Tag></div>
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
    </Tile></Column></Grid>
    
    <div className="collection-settings-actions"><Button kind="primary" renderIcon={Save} onClick={onSave} disabled={saving} aria-busy={saving}>保存采集设置</Button></div>
  </section>;
}
