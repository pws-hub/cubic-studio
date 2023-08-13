
let pm

export const Install = async metadata => {
  pm = pm || await window.IProcess.create({ debug: true })
  return await pm.installApp( metadata )
}

export const Uninstall = async sid => {
  pm = pm || await window.IProcess.create({ debug: true })
  return await pm.uninstallApp( sid )
}