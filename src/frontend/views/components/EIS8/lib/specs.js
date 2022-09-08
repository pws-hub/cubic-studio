
export const REQUIRED_FEATURES = ['geolocation']
export const SANDBOX_RULES = ['allow-scripts', 'allow-same-origin']
export const ACCOUNT_TYPES = {
  'admin': {
    label: 'ADMIN',
    description: 'Wrap all SUPER-ADMIN, ADMIN & SUPERVISOR accounts'
  },
  'instructor': {
    label: 'INSTRUCTOR',
    description: 'Standard instructor account'
  },
  'learner': {
    label: 'LEARNER',
    description: 'Standard learner/student account'
  }
}
export const ACTIVITY_CONTEXTS = {
  'Explore Courses': {
    page: 'course',
    event: { id: 'course-id' },
    keywords: [ 'course', 'program', 'activity' ]
  },
  'Classroom': {
    page: 'classroom',
    event: { id: 'enrollment-id' },
    keywords: [ 'course', 'program', 'activity', 'note', 'library' ]
  }
}