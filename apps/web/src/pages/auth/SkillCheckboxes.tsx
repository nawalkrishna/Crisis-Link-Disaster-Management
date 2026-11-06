import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { VOLUNTEER_SKILLS, type VolunteerSkill } from '@crisislink/shared';
import { humanize } from '../../lib/format';

/**
 * A group of checkboxes edited as ONE array value (skills: ['FIRST_AID', 'DRIVING']).
 * `Controller` connects a custom input like this to react-hook-form.
 */
export function SkillCheckboxes<T extends FieldValues>({ control }: { control: Control<T> }) {
  return (
    <Controller
      control={control}
      name={'skills' as Path<T>}
      render={({ field }) => {
        const selected: VolunteerSkill[] = field.value ?? [];
        const toggle = (skill: VolunteerSkill) =>
          field.onChange(
            selected.includes(skill) ? selected.filter((s) => s !== skill) : [...selected, skill],
          );
        return (
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">Skills</legend>
            <p className="mb-2 text-xs text-slate-500">Some tasks need a specific skill.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VOLUNTEER_SKILLS.map((skill) => (
                <label
                  key={skill}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-slate-900"
                    checked={selected.includes(skill)}
                    onChange={() => toggle(skill)}
                  />
                  {humanize(skill)}
                </label>
              ))}
            </div>
          </fieldset>
        );
      }}
    />
  );
}
