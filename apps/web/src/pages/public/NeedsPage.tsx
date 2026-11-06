import { PRIORITIES, SUPPLY_CATEGORIES } from '@crisislink/shared';
import { NeedRow } from '../../components/domain';
import { DistrictFilter, EnumSelect } from '../../components/filters';
import { useFilterParams } from '../../lib/filter-params';
import { Card, EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../../components/ui';
import { useNeeds } from '../../lib/queries';

const LIMIT = 20;

export default function NeedsPage() {
  const { values, query, offset, set } = useFilterParams([
    'district',
    'category',
    'priority',
  ] as const);
  const needs = useNeeds({ ...query, limit: LIMIT, offset });

  return (
    <div>
      <PageHeader
        title="What camps need"
        description="Open requests from relief camps, most urgent first. Pledge what you can deliver."
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <DistrictFilter value={values.district} onChange={(v) => set('district', v)} />
        <EnumSelect
          label="Category"
          value={values.category}
          options={SUPPLY_CATEGORIES}
          onChange={(v) => set('category', v)}
        />
        <EnumSelect
          label="Priority"
          value={values.priority}
          options={PRIORITIES}
          onChange={(v) => set('priority', v)}
        />
      </div>

      <Card className="py-0">
        {needs.isPending ? (
          <Spinner />
        ) : needs.isError ? (
          <div className="py-5">
            <ErrorState error={needs.error} onRetry={() => needs.refetch()} />
          </div>
        ) : needs.data.items.length === 0 ? (
          <div className="py-5">
            <EmptyState title="No open needs match these filters" />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {needs.data.items.map((need) => (
              <NeedRow key={need.id} need={need} showCamp />
            ))}
          </ul>
        )}
      </Card>
      {needs.data && (
        <Pagination
          total={needs.data.total}
          limit={LIMIT}
          offset={offset}
          onChange={(o) => set('offset', o)}
        />
      )}
    </div>
  );
}
