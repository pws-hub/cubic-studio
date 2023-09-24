# cubic-studio

Environment and Tools to create micro-web applications for PWS, Multipple and other web platforms.

![Demo picture](https://github.com/pws-hub/cubic-studio/blob/master/public/screenshot.png?raw=true)

## Installation & Usage
Open your favorate terminal. Go to the directory where you want to add the project and run respectively the commands below.

```
git clone https://github.com/pws-hub/cubic-studio

cd /cubic-studio

yarn install
```

`npm install` for those who prefere it.


At the project root, look for the file with the name `.env.dev`. Remove the `.dev` 
from the file name and it becomes your `.env` file and contains the necessary environment variables to run the project.

Then run the command below to start the app

```
yarn start
```

Open your browser, enter **http://localhost:12120** and there you go.

Full documentation of how to use it is upcoming, for now, enjoy playing with it.

Roadmap
-------

### Backend
- [x] Session manager with Redis database
- [x] Locale Package Storage (LPS) server
- [x] HTTP + Socket connection server
- [x] Routers
  - [x] UI pages
  - [x] Static assets routers
  - [x] Proxy request handler
  - [x] Custom handlers
- [x] Core
  - [x] Cubic Package Manager (CPM)
  - [x] Cubic Universal Package (CUP) interface
  - [x] Server-side Emulator process manager
  - [x] FileSystem manager
  - [x] Generic File manager
  - [x] Git Manager
  - [x] Internal Process Manager
- [ ] Libraries
  - [x] Cubic API Request (CAR) socket channel handler
  - [x] File System Transaction (FST) socket channel handler
  - [x] Internal process Transaction (IPT) socket channel handler
  - [ ] `fs`: Adaptive file system manager
    - [x] Local functions
    - [ ] Cloud based functions
  - [ ] `path` Adaptive file system directory path manager
    - [x] Local functions
    - [ ] Cloud based functions
  - [x] Custom API Request handler middleware
  - [x] Custom Authentication Request handler middleware
  - [x] Customized Base64 encoder/decoder
  - [x] DTCrypt encryption library
  - [x] Shell/Bash script runner
  - [x] Segregated backend and frontend functions synchronizer (Session, store files, logs, ...)
- [ ] Cloud based requirements
  - [ ] Dependencies installer
  - [ ] Deployment sandbox creator
  - [ ] Emulator environment: Domain, Container, Process manager
- [x] Debug mode logger

### Frontend
- [x] Local Package Storage (LPS) client
- [x] Cubic API Request (CAR) socket client
- [x] File System Transaction (FST) socket client
- [x] Internal process Transaction (IPT) socket client
- [x] Segregated backend and frontend functions synchronizer client
- [x] Platform customization functions overrider
- [x] Cubic Package Manager (CPM) client
- [ ] Service Process Manager (SPM)
- [x] Project workspace Manager
- [x] Project Sections Manager
- [ ] Single Sign-on Auth
  - [x] Github (Default)
  - [x] Multipple (Custom)
  - [ ] One Profile
- [ ] Workspace
  - [x] Create and manage workspaces
  - [x] Customization
    - [ ] Platform based configuration
      - [x] Auth handlers
      - [x] Request handlers
      - [ ] Devices manager (Emulators)
    - [ ] Themes
    - [ ] Workspace layouts & views
  - [ ] workspace add-ons
    - [ ] Add-ons store interface
    - [x] Install/Uninstall add-ons
    - [ ] Run add-on process
    - [ ] Render add-ons UI context & rules
  - [ ] Shortcuts
  - [ ] Dropdown & Context-Menu options
- [ ] Setup projects
  - [x] Create/update/delete project
  - [ ] Setup/Sync `.cubic` environment
  - [ ] Maintain project `.metadata` via UI
  - [ ] Add/Import/Install project dependencies
    - [x] NPM packages
    - [ ] CPR/CPM packages: UI component, Plugins, Libraries
    - [x] Internal store packages: UI component, fonts, icons
- [ ] Import project
  - [ ] From Link
  - [ ] Using Exported file
  - [x] Reading existing working directory
  - [ ] Clone from git repository
  - [ ] Display project in workspace by invitation
- [ ] Exports projects
  - [ ] To `.cep` file
  - [ ] Downloadable `.zip` file
  - [ ] International standards: `openAPI`, ...
- [ ] Share projects
    - [x] Generate share link
    - [ ] Find/assign to a user
    - [ ] With other workspaces
- [x] Delete projects
- [ ] Create and manage teams
  - [ ] User invitation process
  - [ ] Assign/Unassign team members to projects
  - [ ] Assign roles & permissions
- [ ] Publish project
  - [ ] Compliance, Stability & Security checks
  - [x] CPM to CPR deployment process
  - [ ] Verification certificate generator
  - [ ] Update/Release settings
  - [ ] Availability on store
- [ ] Activity tracking & History
- [ ] View & Edit User account
- [x] Utilities Search
  - [x] Public repositories
  - [x] Internal store
  - [ ] Find in workspace: Tools, Settings, Supports, ...
- [ ] In-build console & terminal
  - [x] Debug console & trace tracking
  - [ ] Command line interface (CLI)
  - [ ] Build logs
  - [x] General error logs: Info, Warning, Critial, ...
- [ ] UI alert & prompt dialog messages
- [x] Offline & Online synchronizer
- [ ] Main UI Pages
  - [x] Home page: Authentication, Active Sessions & workspaces
  - [ ] Workspace page
    - [x] Workspace details
    - [ ] Manage workspace actions
    - [ ] Manage team
    - [ ] Manage Projects
    - [ ] Supports & documentation section
    - [ ] Display recents workspace activity histories
  - [ ] Project page
    - [ ] Baseline layout view
      - [x] SideToggles: Control layout component display (Eg. Left toggles: Menu, sidebar, ...)
      - [ ] Header
        - [ ] Super menu options
        - [ ] Active users avatars
      - [x] Menu
        - [x] Project's name & logo
        - [x] Project specs
        - [x] Utilities access toggles: Navigation back, Add, Search, Home
      - [ ] Left Sidebar
        - [x] Project directories tree
        - [ ] Project element collections tree
        - [ ] Project environments tree
        - [x] Project dependencies
      - [ ] Footer
        - [ ] Environment configuration platform name & toggle
        - [x] Workspace name & toggle
        - [x] Console toggle
        - [x] Active project specs displayable details
      - [ ] Toolbar
        - [x] Static toggles
        - [ ] Dynamic toggles by active add-ons
      - [x] Main Block View (By active project specs)
      - [ ] Right Side Block: Add-on context display
        - [ ] Open/Close control & mechanism
        - [ ] Display & expensibility (Small, medium, full screen)
    - [x] Setting widget
    - [x] Search widget
    - [x] Add features widget
    - [ ] Dependencies installation details widget
- [ ] Main project Specs
  - [x] Code Editor
    - [x] Monaco Editor integration
    - [x] Load & register Grammers
    - [ ] Language Server integration
    - [x] Render media files: Eg. image, video, ...
  - [ ] Create & test Rest API requests
    - [ ] Collection tree: Categories, Requests, Saved requests
    - [ ] Environments: Global context, collection context, category context, user session context
    - [ ] Request structure & input components: URL, params, variables, headers, descriptions, ...
    - [ ] Import/Export collections to `.json` and `openAPI`
    - [ ] Proxy Server
    - [ ] Test scripts support
    - [ ] Test runner
  - [ ] Create & test Sockets requests
    - [ ] Websocket support
    - [ ] Socket.io support
    - [ ] TCP Socket support
    - [ ] Collection tree: Categories, Requests, Saved requests
    - [ ] Environments: Global context, collection context, category context, user session context
    - [ ] Request structure & input components: URL, params, variables, headers, ...
    - [ ] Import/Export collections to `.json`
    - [ ] Test scripts support
    - [ ] Test runner
  - [ ] Documentation generator
    - [ ] Markdown supported editor integration
    - [ ] Doc outlines extractor
    - [ ] Illustration code editor integration
    - [ ] Integrated API request display & run module
    - [ ] Playgrounds embedding module
    - [ ] Import/Export `README.md` files
  - [ ] Create and run Unit tests
  - [ ] Project roadmap & tasks manager
- [ ] Internationalization (Multiple language support)
  - [x] Supported languages manifest & files
  - [x] Translation handler component
  - [ ] Translator tools
- [ ] Add-ons
  - [ ] Device manager
    - [x] Emulators
    - [ ] Native connections
  - [ ] Live collaboration
  - [ ] No-code UI designer
  - [ ] Git manager interface

### Electron
Generate desktop version installable on Window, macOS, linux.
- [ ] Electron packaging setup
- [ ] Main window
  - [ ] Menu options
  - [ ] Preloaders
- [ ] Internal processes
- [ ] Notification system
- [ ] New update handlers

It's not a fully completed roadmap. More features will be added as implementation goes on and some aspects/sections will be much more ellaborated if the requirements or the needs change. The team will also share updates in case any major features overtaken by contributors must face some sort of change.


Feedback & Contribution
-------

Feedbacks are all welcome. Kindly report any encounted [Issues here][] and we'll be glad to work on it right away. Thank you.
for those who would like to contribute, do not esitate. Create a fork of the project, send a PR and we'll get along from there. Guidelines and code of conduct for CONTRIBUTORS will be publish soon.


License
-------

This software is free to use under the GNU license. See the [LICENSE file][] for license text and copyright information.


[LICENSE file]: https://github.com/pws-hub/cubic-studio/blob/master/LICENSE
[Issues here]: https://github.com/pws-hub/cubic-studio/issues
