update public.website_work_items
set status = 'archived',
    published_to_carlos = false,
    latest_decision_at = now()
where task_key = 'carlos-fixed-call-suppliers';

update public.website_work_items
set title = 'API, Affiliate & Partnership',
    summary = 'Manage supplier APIs, affiliate programs, and partnerships.',
    next_step = 'Review the important supplier programs and record the next action.',
    latest_decision_at = now()
where task_key = 'carlos-fixed-supplier-affiliate-program';

update public.manager_goals
set title = 'API, Affiliate & Partnership'
where details = 'system_goal_status:supplier-affiliate-program';
