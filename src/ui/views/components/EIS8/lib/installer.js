
let pm

export const Install = async options => {
  pm = pm || await window.IProcess.create({ debug: true })
  return await pm.installApp( options )
}

export const Uninstall = async appId => {
  pm = pm || await window.IProcess.create({ debug: true })
  return await pm.uninstallApp( appId )
}