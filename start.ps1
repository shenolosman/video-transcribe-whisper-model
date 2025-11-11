
# Autonomous start script for backend (Python venv) and frontend (Node.js)
# - Ensures backend venv exists and requirements are installed
# - Ensures frontend node_modules exists and installs if missing
# - Starts both servers in new PowerShell windows

$backendPath = Join-Path $PSScriptRoot 'backend'
$frontendPath = Join-Path $PSScriptRoot 'frontend'
$venvPath = Join-Path $PSScriptRoot '.venv'
$venvPython = Join-Path $venvPath 'Scripts/python.exe'
$backendRequirements = Join-Path $backendPath 'requirements.txt'
$frontendNodeModules = Join-Path $frontendPath 'node_modules'

# Ensure venv exists
if (!(Test-Path $venvPython)) {
	Write-Host 'Creating Python venv...'
	Push-Location $PSScriptRoot
	python -m venv .venv
	Pop-Location
}

# Install backend requirements
Write-Host 'Installing backend requirements...'
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r $backendRequirements

# Ensure frontend dependencies
if (!(Test-Path $frontendNodeModules)) {
	Write-Host 'Installing frontend dependencies...'
	Push-Location $frontendPath
	npm install
	Pop-Location
}


# Start backend on port 8000
Write-Host 'Starting backend server on port 8000...'
$backendVenvPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
Start-Process -NoNewWindow -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd ./backend; & '$backendVenvPython' -m uvicorn main:app --reload --port 8000"

# Start frontend
Write-Host 'Starting frontend server...'
Start-Process -NoNewWindow -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd ./frontend; npm run dev"

Write-Host "Both backend and frontend are starting in separate PowerShell windows."
