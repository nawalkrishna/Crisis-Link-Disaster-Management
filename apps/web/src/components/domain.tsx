/** Building blocks that know about CrisisLink data (camps, needs, incidents). */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { MapPin, Phone, Users } from 'lucide-react';
import type { CampNeed, CampSummary, Incident } from '@crisislink/shared';
import {
  formatNumber,
  humanize,
  pluralize,
  priorityTone,
  statusTone,
  timeAgo,
} from '../lib/format';
import { cn } from './styles';
import { Badge, ButtonLink, Card, ProgressBar } from './ui';

export function StatTile({
  label,
  value,
  detail,
  icon,
  emphasis,
}: {
  label: string;
  value: number | string;
  detail?: ReactNode;
  icon?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <Card className={cn('flex flex-col gap-1', emphasis && 'border-red-200 bg-red-50/50')}>
      <div className="flex items-start justify-between gap-2 text-sm font-medium text-slate-600">
        {label}
        {icon}
      </div>
      <div className="text-3xl font-bold tabular-nums tracking-tight">
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      {detail && <div className="text-xs text-slate-500">{detail}</div>}
    </Card>
  );
}

export function CampCard({ camp, href }: { camp: CampSummary; href?: string }) {
  return (
    <Link
      to={href ?? `/camps/${camp.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold group-hover:underline">{camp.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-500">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {camp.address}, {camp.district.name}
          </p>
        </div>
        <Badge tone={statusTone(camp.status)}>{humanize(camp.status)}</Badge>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 text-slate-700">
          <Users className="size-4" aria-hidden />
          {formatNumber(camp.occupancy)} / {formatNumber(camp.capacity)}
        </span>
        <span className={cn('text-slate-500', camp.openNeeds > 0 && 'font-medium text-amber-800')}>
          {pluralize(camp.openNeeds, 'open need')}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={camp.occupancy} max={camp.capacity} label={`${camp.name} occupancy`} />
      </div>
    </Link>
  );
}

export function NeedRow({
  need,
  showCamp,
  actions,
}: {
  need: CampNeed;
  showCamp?: boolean;
  actions?: ReactNode;
}) {
  const remaining = Math.max(0, need.quantityNeeded - need.quantityFulfilled);
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{need.item}</span>
          <Badge tone={priorityTone[need.priority]}>{humanize(need.priority)}</Badge>
          <Badge>{humanize(need.category)}</Badge>
          {need.status !== 'OPEN' && (
            <Badge tone={statusTone(need.status)}>{humanize(need.status)}</Badge>
          )}
        </div>
        {showCamp && need.camp && (
          <Link
            to={`/camps/${need.camp.id}`}
            className="mt-0.5 block text-sm text-slate-500 hover:underline"
          >
            {need.camp.name} · {need.camp.district.name}
          </Link>
        )}
        <div className="mt-2 flex items-center gap-3">
          <div className="w-40">
            <ProgressBar
              value={need.quantityFulfilled}
              max={need.quantityNeeded}
              label={`${need.item} received`}
            />
          </div>
          <span className="text-xs text-slate-600">
            {formatNumber(need.quantityFulfilled)} of {formatNumber(need.quantityNeeded)}{' '}
            {need.unit}
            {need.status === 'OPEN' && remaining > 0 && (
              <>
                {' '}
                · <strong>{formatNumber(remaining)} still needed</strong>
              </>
            )}
          </span>
        </div>
      </div>
      {actions ??
        (need.status === 'OPEN' && (
          <ButtonLink to={`/donate?needId=${need.id}`} variant="secondary" size="sm">
            Pledge
          </ButtonLink>
        ))}
    </li>
  );
}

export function IncidentCard({ incident, actions }: { incident: Incident; actions?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={priorityTone[incident.severity]}>{humanize(incident.severity)}</Badge>
        <Badge tone={statusTone(incident.status)}>{humanize(incident.status)}</Badge>
        <span className="ml-auto text-xs text-slate-500">{timeAgo(incident.createdAt)}</span>
      </div>
      <h3 className="font-semibold">
        {humanize(incident.type)} · {incident.locationText}
      </h3>
      <p className="text-sm text-slate-500">{incident.district.name}</p>
      <p className="text-sm text-slate-700">{incident.description}</p>
      {(incident.reporterName || incident.reporterPhone) && (
        <p className="flex items-center gap-1 text-sm text-slate-600">
          <Phone className="size-3.5" aria-hidden />
          Reported by {incident.reporterName ?? 'anonymous'}
          {incident.reporterPhone && (
            <a
              href={`tel:${incident.reporterPhone}`}
              className="font-medium text-slate-900 underline"
            >
              {incident.reporterPhone}
            </a>
          )}
        </p>
      )}
      {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
    </Card>
  );
}
