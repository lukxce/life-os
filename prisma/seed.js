const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // ── Finance: Accounts ────────────────────────────────────────────────────
  const accounts = [
    { name: 'Personal EUR', type: 'personal', currency: 'EUR' },
    { name: 'Personal RSD – OTP Banka', type: 'personal', currency: 'RSD' },
    { name: 'Personal RSD – Erste Banka', type: 'personal', currency: 'RSD' },
    { name: 'Personal EUR Savings', type: 'personal', currency: 'EUR' },
    { name: 'Personal RSD Savings', type: 'personal', currency: 'RSD' },
    { name: 'Company RSD', type: 'company', currency: 'RSD' },
    { name: 'Company EUR', type: 'company', currency: 'EUR' },
    { name: 'Crypto', type: 'personal', currency: 'EUR' },
  ]
  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { id: acc.name },
      update: {},
      create: { id: acc.name, ...acc, startingBalance: 0 },
    })
  }

  // ── Finance: Personal categories ─────────────────────────────────────────
  const personal = [
    { name: 'Food & Groceries', subcategories: ['Supermarket','Restaurant','Takeaway','Bakery','Other'] },
    { name: 'Transport', subcategories: ['Fuel','Taxi','Parking','Public Transport','Car Service','Other'] },
    { name: 'Rent & Utilities', subcategories: ['Rent','Electricity','Internet','Water','Gas','Phone Bill','Other'] },
    { name: 'Entertainment', subcategories: ['Dining Out','Cinema','Streaming','Sports','Events','Other'] },
    { name: 'Health', subcategories: ['Pharmacy','Doctor','Dentist','Gym','Other'] },
    { name: 'Clothing', subcategories: ['Clothes','Shoes','Accessories','Other'] },
    { name: 'Other', subcategories: ['Other'] },
  ]
  for (const cat of personal) {
    await prisma.category.upsert({
      where: { userId_name_type: { userId: 'default', name: cat.name, type: 'personal' } },
      update: {},
      create: { name: cat.name, type: 'personal', subcategories: cat.subcategories },
    })
  }

  // ── Finance: Business categories ─────────────────────────────────────────
  const business = [
    { name: 'Software & Subscriptions', subcategories: ['Adobe','Notion','Slack','Microsoft','Google','Other'] },
    { name: 'Equipment', subcategories: ['Laptop','Monitor','Phone','Camera','Peripherals','Other'] },
    { name: 'Travel', subcategories: ['Flight','Hotel','Car Rental','Meals','Other'] },
    { name: 'Contractor Payments', subcategories: ['Freelancer','Agency','Consultant','Other'] },
    { name: 'Office Supplies', subcategories: ['Stationery','Furniture','Printing','Other'] },
    { name: 'Other', subcategories: ['Other'] },
  ]
  for (const cat of business) {
    await prisma.category.upsert({
      where: { userId_name_type: { userId: 'default', name: cat.name, type: 'business' } },
      update: {},
      create: { name: cat.name, type: 'business', subcategories: cat.subcategories },
    })
  }

  // ── Life: Habits ──────────────────────────────────────────────────────────
  const habits = [
    { id: 'habit-water', name: 'Water', category: 'Health & Body', type: 'quantity', unit: 'ml', target: 2000, frequency: 'daily', frequencyDays: [], icon: '💧', color: '#3b82f6', timeOfDay: 'morning', order: 0, active: true },
    { id: 'habit-gym', name: 'Gym', category: 'Health & Body', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '🏋️', color: '#f97316', timeOfDay: 'morning', order: 1, active: true },
    { id: 'habit-stretches', name: 'Stretches', category: 'Health & Body', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '🧘', color: '#8b5cf6', timeOfDay: 'morning', order: 2, active: true },
    { id: 'habit-night-routine', name: 'Night routine', category: 'Evening Routine', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '🌙', color: '#6366f1', timeOfDay: 'night', order: 3, active: true },
    { id: 'habit-read', name: 'Read', category: 'Evening Routine', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '📚', color: '#10b981', timeOfDay: 'night', order: 4, active: true },
    { id: 'habit-magnesium', name: 'Magnesium glycinate', category: 'Health & Body', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '💊', color: '#06b6d4', timeOfDay: 'morning', order: 5, active: true },
    { id: 'habit-oligovit', name: 'Oligovit (multivitamin)', category: 'Health & Body', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '🌿', color: '#22c55e', timeOfDay: 'morning', order: 6, active: true },
    { id: 'habit-morning-ritual', name: 'Morning ritual', category: 'Health & Body', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '☀️', color: '#f59e0b', timeOfDay: 'morning', order: 7, active: true },
    { id: 'habit-if-window', name: 'IF window held', category: 'Health & Body', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '⏱️', color: '#84cc16', timeOfDay: 'all_day', order: 8, active: true },
    { id: 'habit-kindle', name: 'Kindle before sleep', category: 'Evening Routine', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '📖', color: '#f97316', timeOfDay: 'night', order: 9, active: true },
    { id: 'habit-phone-midnight', name: 'Phone out by midnight', category: 'Evening Routine', type: 'boolean', unit: null, target: null, frequency: 'daily', frequencyDays: [], icon: '📵', color: '#ef4444', timeOfDay: 'night', order: 10, active: true },
    { id: 'fitness-pt',        name: 'PT Session',                category: 'Fitness', type: 'boolean', unit: null, target: null, frequency: 'specific_days', frequencyDays: [1,3,5], icon: '🏋️', color: '#8b5cf6', timeOfDay: 'all_day',  order: 20, active: true },
    { id: 'fitness-bike',      name: 'Bike Ride',                 category: 'Fitness', type: 'boolean', unit: null, target: null, frequency: 'specific_days', frequencyDays: [2,6],   icon: '🚴', color: '#3b82f6', timeOfDay: 'all_day',  order: 21, active: true },
    { id: 'fitness-circuit',   name: 'Morning Bodyweight Circuit', category: 'Fitness', type: 'boolean', unit: null, target: null, frequency: 'specific_days', frequencyDays: [1,2,3,4,5,6], icon: '💪', color: '#10b981', timeOfDay: 'morning', order: 22, active: true },
    { id: 'fitness-bend',      name: 'Bend App',                  category: 'Fitness', type: 'boolean', unit: null, target: null, frequency: 'daily',         frequencyDays: [],      icon: '🧘', color: '#f59e0b', timeOfDay: 'morning', order: 23, active: true },
    { id: 'weekly-weight', name: 'Weight logged', category: 'Weekly Check-in', type: 'quantity', unit: 'kg', target: 1, frequency: 'specific_days', frequencyDays: [0], icon: '⚖️', color: '#8b5cf6', timeOfDay: 'all_day', order: 0, active: true },
    { id: 'weekly-review', name: 'Weekly review done', category: 'Weekly Check-in', type: 'boolean', unit: null, target: null, frequency: 'specific_days', frequencyDays: [0], icon: '📋', color: '#6366f1', timeOfDay: 'all_day', order: 1, active: true },
    { id: 'weekly-agency-tasks', name: 'Agency tasks assigned to slots', category: 'Weekly Check-in', type: 'boolean', unit: null, target: null, frequency: 'specific_days', frequencyDays: [0], icon: '🗂️', color: '#3b82f6', timeOfDay: 'all_day', order: 2, active: true },
    { id: 'weekly-social', name: 'Social touchpoint made', category: 'Weekly Check-in', type: 'boolean', unit: null, target: null, frequency: 'specific_days', frequencyDays: [0], icon: '🤝', color: '#10b981', timeOfDay: 'all_day', order: 3, active: true },
  ]
  for (const habit of habits) {
    await prisma.habit.upsert({ where: { id: habit.id }, update: {}, create: habit })
  }

  // One-off: the daily "Gym" habit is superseded by PT Session (3x/week).
  // Remove this block if you ever want to re-enable it.
  await prisma.habit.updateMany({ where: { id: 'habit-gym', active: true }, data: { active: false } })

  // ── Shared: Settings ─────────────────────────────────────────────────────
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', userId: 'default', manualRate: 117.5, weekStartsOn: 1, theme: 'light' },
  })

  // ── Life: Schedule days ───────────────────────────────────────────────────
  const scheduleDays = [
    { day: 'mon', label: 'Monday — PT day.', summary: 'Heaviest meeting day. Deep work window is 09:30-10:00 only. Protect it. Meetings 10-16. PT sacred at 16. Agency post-PT.' },
    { day: 'tue', label: 'Tuesday — agency + property day.', summary: 'Best morning of the week. Free 09:00-11:00. Use it fully for deep work. Property coordination 16:00-18:00 after meetings end.' },
    { day: 'wed', label: 'Wednesday — PT day.', summary: 'Lighter meeting load. Morning agency window 09:30-10:00. Meetings clear by 15:00. PT at 16:00 sacred. Good hosting evening.' },
    { day: 'thu', label: 'Thursday — variable day.', summary: 'Heavy when project meetings land (13-15 USP block). Normal weeks have a real gap 12-16. Treat it as Hypefy-first, agency-opportunistic.' },
    { day: 'fri', label: 'Friday — PT day.', summary: 'Close the week clean. Deep work 09:30-10:00. Clear all open loops before 16:00 PT. Nothing carries into the weekend.' },
    { day: 'sat', label: 'Saturday — active social day.', summary: 'No work. IF holds. Long outdoor session midday. Main social investment window of the week. Host or go out.' },
    { day: 'sun', label: 'Sunday — reset day.', summary: 'Weekly review at 10:30 runs the whole week. Assign agency tasks, confirm property coordination, close open loops. Full rest afternoon. Prep Monday tonight.' },
  ]
  for (const d of scheduleDays) {
    await prisma.scheduleDay.upsert({ where: { day: d.day }, update: { label: d.label, summary: d.summary }, create: d })
  }

  // ── Life: Schedule blocks (only seed if none exist) ───────────────────────
  const blockCount = await prisma.scheduleBlock.count()
  if (blockCount === 0) {
    await prisma.scheduleBlock.createMany({ data: [
      { day:'mon', startTime:'09:00', endTime:'09:30', name:'Morning ritual', note:'Alarm clock. Bathroom. Skincare. Mat stretch 10min. Powerade. Work check standing 2min only.', category:'ritual', sacred:true },
      { day:'mon', startTime:'09:30', endTime:'10:00', name:'Deep work — phone in box', note:'Hypefy strategic or agency task. Assigned Sunday. 30min, no interruptions.', category:'agency', sacred:true },
      { day:'mon', startTime:'10:00', endTime:'12:00', name:'Hypefy meetings', note:'Dev Daily Sync, Nikola x Luka, Product x Marketing. Back to back. Phone away, be present.', category:'hypefy', sacred:false },
      { day:'mon', startTime:'12:00', endTime:null, name:'Break fast — first meal', note:'Eggs + veg + olive oil. No phone at table. 20min actual break.', category:'food', sacred:true },
      { day:'mon', startTime:'13:00', endTime:'16:00', name:'Hypefy meetings', note:'Performance Marketing, Product Roadmap, Sprint Planning, Luka x Filip.', category:'hypefy', sacred:false },
      { day:'mon', startTime:'16:00', endTime:'17:30', name:'PT session', note:'Never moved. Never sacrificed. This is non-negotiable.', category:'pt', sacred:true },
      { day:'mon', startTime:'17:30', endTime:'18:30', name:'Agency work', note:'Strategic or creative. Post-PT brain is still good.', category:'agency', sacred:false },
      { day:'mon', startTime:'18:30', endTime:'19:00', name:'Main meal — window closes 20:00', note:'Post-workout. Big protein.', category:'food', sacred:true },
      { day:'mon', startTime:'20:00', endTime:'00:00', name:'Evening — your time', note:'Social, Hinge, walk, call someone. Fully yours. No work after 20:00.', category:'social', sacred:false },
      { day:'mon', startTime:'00:00', endTime:null, name:'Phone out — Kindle on', note:'Every night. No exceptions.', category:'sleep', sacred:true },
      { day:'tue', startTime:'09:00', endTime:'09:30', name:'Morning ritual', note:'Full sequence. Same every day.', category:'ritual', sacred:true },
      { day:'tue', startTime:'09:30', endTime:'11:00', name:'Agency deep work — phone in box', note:'90min. Best thinking block of the week for agency.', category:'agency', sacred:true },
      { day:'tue', startTime:'11:00', endTime:'12:00', name:'Hypefy — Mina x Luka', note:'One meeting. Be present.', category:'hypefy', sacred:false },
      { day:'tue', startTime:'12:00', endTime:null, name:'Break fast — first meal', note:'Eggs or rye with protein. No phone.', category:'food', sacred:true },
      { day:'tue', startTime:'13:00', endTime:'14:00', name:'Agency execution', note:'Continuation from morning or execution tasks.', category:'agency', sacred:false },
      { day:'tue', startTime:'14:00', endTime:'15:30', name:'Hypefy — All Hands + Dusica x Luka', note:'All Hands at 14, Dusica x Luka at 15.', category:'hypefy', sacred:false },
      { day:'tue', startTime:'16:00', endTime:'18:00', name:'Property coordination', note:'Workers, renovation follow-ups, calls, maintenance.', category:'property', sacred:true },
      { day:'tue', startTime:'18:30', endTime:'19:00', name:'Main meal — window closes 20:00', note:'Protein forward. Window closes 20:00.', category:'food', sacred:true },
      { day:'tue', startTime:'20:00', endTime:'00:00', name:'Evening — your time', note:'Social, reading, Hinge. Fully yours.', category:'social', sacred:false },
      { day:'tue', startTime:'00:00', endTime:null, name:'Phone out — Kindle on', note:'Every night.', category:'sleep', sacred:true },
      { day:'wed', startTime:'09:00', endTime:'09:30', name:'Morning ritual', note:'Full sequence. Midweek anchor.', category:'ritual', sacred:true },
      { day:'wed', startTime:'09:30', endTime:'10:00', name:'Deep work — phone in box', note:'30min pre-meeting.', category:'agency', sacred:true },
      { day:'wed', startTime:'10:00', endTime:'11:00', name:'Hypefy meetings', note:'Hypefy Party Weekly Sync, Dev Daily Sync, MADFEST London.', category:'hypefy', sacred:false },
      { day:'wed', startTime:'11:00', endTime:'12:00', name:'Agency work', note:'Good uninterrupted hour before lunch.', category:'agency', sacred:false },
      { day:'wed', startTime:'12:00', endTime:null, name:'Break fast — first meal', note:'Break fast. Sit down. No phone.', category:'food', sacred:true },
      { day:'wed', startTime:'13:00', endTime:'15:00', name:'Hypefy meetings', note:'Luka x Aleksandar at 13, Luka x Flávio at 14.', category:'hypefy', sacred:false },
      { day:'wed', startTime:'15:00', endTime:'16:00', name:'Agency wrap', note:'Close any open agency tasks before PT.', category:'agency', sacred:false },
      { day:'wed', startTime:'16:00', endTime:'17:30', name:'PT session', note:'Sacred. Always. Never moved.', category:'pt', sacred:true },
      { day:'wed', startTime:'18:30', endTime:null, name:'Main meal — window closes 20:00', note:'Post-workout. Big protein meal.', category:'food', sacred:true },
      { day:'wed', startTime:'20:00', endTime:'00:00', name:'Evening — host or social', note:'Wednesday is a natural hosting night.', category:'social', sacred:false },
      { day:'wed', startTime:'00:00', endTime:null, name:'Phone out — Kindle on', note:'Every night.', category:'sleep', sacred:true },
      { day:'thu', startTime:'09:00', endTime:'09:30', name:'Morning ritual', note:'Same anchor.', category:'ritual', sacred:true },
      { day:'thu', startTime:'09:30', endTime:'10:00', name:'Agency quick tasks', note:'Execution only.', category:'agency', sacred:false },
      { day:'thu', startTime:'10:00', endTime:'12:00', name:'Hypefy meetings', note:'Luka x Aleksandar, Dev Daily Sync, Campaigns Team, Luka MKT & Ana HR.', category:'hypefy', sacred:false },
      { day:'thu', startTime:'12:00', endTime:null, name:'Break fast — first meal', note:'Even on heavy days.', category:'food', sacred:true },
      { day:'thu', startTime:'13:00', endTime:'16:00', name:'Hypefy — variable', note:'Project meetings or deep work.', category:'hypefy', sacred:false },
      { day:'thu', startTime:'16:00', endTime:'17:00', name:'Luka x Stjepan weekly sync', note:'Recurring.', category:'hypefy', sacred:false },
      { day:'thu', startTime:'17:00', endTime:'18:00', name:'Walk or bike', note:'No PT today. Active recovery.', category:'pt', sacred:false },
      { day:'thu', startTime:'18:30', endTime:null, name:'Main meal — window closes 20:00', note:'Window closes 20:00.', category:'food', sacred:true },
      { day:'thu', startTime:'20:00', endTime:'00:00', name:'Evening', note:'Rest, social, reading.', category:'social', sacred:false },
      { day:'thu', startTime:'00:00', endTime:null, name:'Phone out — Kindle on', note:'Every night.', category:'sleep', sacred:true },
      { day:'fri', startTime:'09:00', endTime:'09:30', name:'Morning ritual', note:"End of work week. Don't let Friday slip.", category:'ritual', sacred:true },
      { day:'fri', startTime:'09:30', endTime:'10:00', name:'Deep work — phone in box', note:"Close week's most important output.", category:'agency', sacred:true },
      { day:'fri', startTime:'10:00', endTime:'12:00', name:'Hypefy meetings', note:'Clear all open loops.', category:'hypefy', sacred:false },
      { day:'fri', startTime:'12:00', endTime:null, name:'Break fast — first meal', note:'End of week meal. Enjoy it.', category:'food', sacred:true },
      { day:'fri', startTime:'13:00', endTime:'15:30', name:'Hypefy + agency wrap', note:'Meetings and closing tasks. Inbox zero before PT.', category:'hypefy', sacred:false },
      { day:'fri', startTime:'16:00', endTime:'17:30', name:'PT session', note:'Third session of the week. End strong.', category:'pt', sacred:true },
      { day:'fri', startTime:'18:30', endTime:null, name:'Main meal — window closes 20:00', note:'Post-workout. Big protein.', category:'food', sacred:true },
      { day:'fri', startTime:'20:00', endTime:'00:00', name:'Friday social', note:'Go out, host, meet people. Live it.', category:'social', sacred:false },
      { day:'fri', startTime:'00:00', endTime:null, name:'Phone out — Kindle on', note:'Even Friday. Midnight is midnight.', category:'sleep', sacred:true },
      { day:'sat', startTime:'09:00', endTime:'09:30', name:'Slow morning ritual', note:'Same anchor, slower pace. No work check.', category:'ritual', sacred:true },
      { day:'sat', startTime:'09:30', endTime:'12:00', name:'Morning freedom', note:'Read, walk, sit outside. No agenda.', category:'social', sacred:false },
      { day:'sat', startTime:'12:00', endTime:null, name:'Break fast — first meal', note:'IF holds on Saturday.', category:'food', sacred:true },
      { day:'sat', startTime:'13:00', endTime:'15:30', name:'Active outdoors', note:'Long bike ride, swim, hike, anything outside.', category:'pt', sacred:false },
      { day:'sat', startTime:'16:00', endTime:'20:00', name:'Social — host or go out', note:'Main social investment of the week.', category:'social', sacred:false },
      { day:'sat', startTime:'18:30', endTime:'19:30', name:'Main meal — social dinner', note:'Can be social dinner out. Window closes 20:00.', category:'food', sacred:false },
      { day:'sat', startTime:'20:00', endTime:'00:00', name:'Saturday night', note:'Live your life fully.', category:'social', sacred:false },
      { day:'sat', startTime:'00:00', endTime:null, name:'Phone out — Kindle on', note:'Even Saturday.', category:'sleep', sacred:true },
      { day:'sun', startTime:'09:00', endTime:'09:30', name:'Slow morning ritual', note:'Slowest morning of the week. Zero rush.', category:'ritual', sacred:true },
      { day:'sun', startTime:'10:30', endTime:'11:00', name:'Weekly review — 30 minutes', note:"What happened. What's next. This is the meeting that runs your life.", category:'ritual', sacred:true },
      { day:'sun', startTime:'12:00', endTime:null, name:'Break fast — first meal', note:'IF holds Sunday too.', category:'food', sacred:true },
      { day:'sun', startTime:'13:00', endTime:'18:00', name:'Rest + recharge', note:'Family, reading, nature. Zero work.', category:'social', sacred:false },
      { day:'sun', startTime:'18:30', endTime:null, name:'Main meal — window closes 20:00', note:'Prep mentally for the week ahead.', category:'food', sacred:true },
      { day:'sun', startTime:'20:00', endTime:'20:30', name:'Week prep', note:'Mat on floor. Kindle charged. Alarm set. Ready.', category:'ritual', sacred:true },
      { day:'sun', startTime:'20:30', endTime:'00:00', name:'Evening wind down', note:'Reading, low key.', category:'social', sacred:false },
      { day:'sun', startTime:'00:00', endTime:null, name:'Phone out — Kindle on', note:'Every night. No exceptions.', category:'sleep', sacred:true },
    ]})
  }

  console.log('✅ Life OS seed complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())
