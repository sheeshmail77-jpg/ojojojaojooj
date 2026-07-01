--[[
  AuthSystem Panel — LocalScript
  Served at /panel.lua  (game:HttpGet then loadstring)
--]]

local Players      = game:GetService("Players")
local HttpService  = game:GetService("HttpService")
local TweenService = game:GetService("TweenService")
local UIS          = game:GetService("UserInputService")

local plr  = Players.LocalPlayer
local pgui = plr.PlayerGui

local API_BASE = "http://localhost:3000"   -- ← your domain
local VERSION  = "1.0.0"

-- ── HWID fingerprint ─────────────────────────────────────
local function getHWID()
  local ok, id = pcall(function()
    return tostring(plr.UserId) .. "-" .. tostring(game.PlaceId) ..
           "-" .. (getexecutorname and getexecutorname() or "rbx")
  end)
  return ok and id or tostring(plr.UserId)
end
local HWID = getHWID()

-- ── HTTP POST helper ──────────────────────────────────────
local function postJSON(endpoint, body)
  local ok, res = pcall(function()
    return HttpService:RequestAsync({
      Url     = API_BASE .. endpoint,
      Method  = "POST",
      Headers = { ["Content-Type"] = "application/json" },
      Body    = HttpService:JSONEncode(body),
    })
  end)
  if not ok then return nil, "Network error" end
  local succ, data = pcall(HttpService.JSONDecode, HttpService, res.Body)
  if not succ then return nil, "Parse error" end
  if res.StatusCode ~= 200 then return nil, data.error or ("HTTP " .. res.StatusCode) end
  return data, nil
end

-- ── State ─────────────────────────────────────────────────
local savedKey = ""
local authed   = false

-- ── Remove old panel ──────────────────────────────────────
if pgui:FindFirstChild("AuthPanel") then pgui.AuthPanel:Destroy() end

-- ── ScreenGui ─────────────────────────────────────────────
local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name           = "AuthPanel"
ScreenGui.ResetOnSpawn   = false
ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
ScreenGui.DisplayOrder   = 999
ScreenGui.Parent         = pgui

-- ── Helpers ───────────────────────────────────────────────
local function mkCorner(r, p)
  local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r); c.Parent = p
end
local function mkStroke(col, th, p)
  local s = Instance.new("UIStroke"); s.Color = col; s.Thickness = th; s.Parent = p
end
local function mkPad(h, v, p)
  local u = Instance.new("UIPadding")
  u.PaddingLeft = UDim.new(0,h); u.PaddingRight  = UDim.new(0,h)
  u.PaddingTop  = UDim.new(0,v); u.PaddingBottom = UDim.new(0,v)
  u.Parent = p
end

-- ── Main frame ────────────────────────────────────────────
local Main = Instance.new("Frame")
Main.Name            = "Main"
Main.Size            = UDim2.new(0, 340, 0, 430)
Main.Position        = UDim2.new(0.5, -170, 0.5, -215)
Main.BackgroundColor3= Color3.fromRGB(8, 13, 27)
Main.BorderSizePixel = 0
Main.Parent          = ScreenGui
mkCorner(14, Main)
mkStroke(Color3.fromRGB(90, 50, 200), 1.5, Main)

Instance.new("UIGradient", Main).Color = ColorSequence.new(
  Color3.fromRGB(10, 16, 38), Color3.fromRGB(6, 10, 22))

-- ── Title bar ─────────────────────────────────────────────
local TB = Instance.new("Frame")
TB.Name            = "TitleBar"
TB.Size            = UDim2.new(1, 0, 0, 44)
TB.BackgroundColor3= Color3.fromRGB(13, 19, 46)
TB.BorderSizePixel = 0; TB.Parent = Main
mkCorner(14, TB)
local TBfix = Instance.new("Frame", TB)
TBfix.Size = UDim2.new(1,0,0,14); TBfix.Position = UDim2.new(0,0,1,-14)
TBfix.BackgroundColor3 = Color3.fromRGB(13,19,46); TBfix.BorderSizePixel = 0

local TitleLbl = Instance.new("TextLabel", TB)
TitleLbl.Text = "🔐  AuthSystem  v"..VERSION
TitleLbl.Size = UDim2.new(1,-50,1,0); TitleLbl.Position = UDim2.new(0,14,0,0)
TitleLbl.BackgroundTransparency = 1
TitleLbl.Font = Enum.Font.GothamBold; TitleLbl.TextSize = 14
TitleLbl.TextColor3 = Color3.fromRGB(170,120,255)
TitleLbl.TextXAlignment = Enum.TextXAlignment.Left

local CloseBtn = Instance.new("TextButton", TB)
CloseBtn.Text = "✕"; CloseBtn.Size = UDim2.new(0,28,0,28)
CloseBtn.Position = UDim2.new(1,-36,0.5,-14)
CloseBtn.BackgroundColor3 = Color3.fromRGB(239,68,68)
CloseBtn.Font = Enum.Font.GothamBold; CloseBtn.TextSize = 12
CloseBtn.TextColor3 = Color3.fromRGB(255,255,255); CloseBtn.BorderSizePixel = 0
mkCorner(7, CloseBtn)

-- ── Drag ─────────────────────────────────────────────────
local dragging, dragStart, startPos
TB.InputBegan:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.MouseButton1 then
    dragging = true; dragStart = i.Position
    startPos = Main.Position
  end
end)
UIS.InputChanged:Connect(function(i)
  if dragging and i.UserInputType == Enum.UserInputType.MouseMovement then
    local d = i.Position - dragStart
    Main.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X,
                               startPos.Y.Scale, startPos.Y.Offset + d.Y)
  end
end)
UIS.InputEnded:Connect(function(i)
  if i.UserInputType == Enum.UserInputType.MouseButton1 then dragging = false end
end)

CloseBtn.MouseButton1Click:Connect(function()
  TweenService:Create(Main, TweenInfo.new(.2, Enum.EasingStyle.Quad),
    { Position = UDim2.new(0.5,-170, 1.2, 0) }):Play()
  task.wait(.22); ScreenGui:Destroy()
end)

-- ── Notification ──────────────────────────────────────────
local NotifFrame = Instance.new("Frame", Main)
NotifFrame.Size = UDim2.new(1,-28,0,36); NotifFrame.Position = UDim2.new(0,14,0,52)
NotifFrame.BackgroundColor3 = Color3.fromRGB(16,22,44); NotifFrame.BorderSizePixel = 0
NotifFrame.Visible = false; mkCorner(8, NotifFrame)

local NotifLabel = Instance.new("TextLabel", NotifFrame)
NotifLabel.Size = UDim2.new(1,-12,1,0); NotifLabel.Position = UDim2.new(0,8,0,0)
NotifLabel.BackgroundTransparency = 1; NotifLabel.Font = Enum.Font.Gotham
NotifLabel.TextSize = 12; NotifLabel.TextColor3 = Color3.fromRGB(200,200,200)
NotifLabel.TextXAlignment = Enum.TextXAlignment.Left; NotifLabel.TextWrapped = true

local notifThread
local function notify(msg, color)
  if notifThread then task.cancel(notifThread) end
  NotifLabel.Text = msg
  NotifLabel.TextColor3 = color or Color3.fromRGB(200,200,200)
  NotifFrame.Visible = true
  notifThread = task.delay(4, function() NotifFrame.Visible = false end)
end
local function notifyOk(m)  notify("✅  " .. m, Color3.fromRGB(16,185,129)) end
local function notifyErr(m) notify("❌  " .. m, Color3.fromRGB(239,68,68))  end
local function notifyInf(m) notify("ℹ️  " .. m, Color3.fromRGB(96,165,250)) end

-- ── Status strip ──────────────────────────────────────────
local StatusStrip = Instance.new("Frame", Main)
StatusStrip.Size = UDim2.new(1,-28,0,28); StatusStrip.Position = UDim2.new(0,14,0,96)
StatusStrip.BackgroundColor3 = Color3.fromRGB(10,17,38); StatusStrip.BorderSizePixel=0
mkCorner(7, StatusStrip)

local StatusDot = Instance.new("Frame", StatusStrip)
StatusDot.Size = UDim2.new(0,8,0,8); StatusDot.Position = UDim2.new(0,10,0.5,-4)
StatusDot.BackgroundColor3 = Color3.fromRGB(100,100,100); StatusDot.BorderSizePixel=0
mkCorner(4, StatusDot)

local StatusLbl = Instance.new("TextLabel", StatusStrip)
StatusLbl.Text = "Not authenticated"; StatusLbl.Size = UDim2.new(1,-28,1,0)
StatusLbl.Position = UDim2.new(0,24,0,0); StatusLbl.BackgroundTransparency = 1
StatusLbl.Font = Enum.Font.Gotham; StatusLbl.TextSize = 11
StatusLbl.TextColor3 = Color3.fromRGB(100,100,100); StatusLbl.TextXAlignment = Enum.TextXAlignment.Left

local function setStatus(ok, msg)
  StatusDot.BackgroundColor3  = ok and Color3.fromRGB(16,185,129) or Color3.fromRGB(239,68,68)
  StatusLbl.TextColor3        = ok and Color3.fromRGB(16,185,129) or Color3.fromRGB(239,68,68)
  StatusLbl.Text              = msg
end

-- ── Key input row ─────────────────────────────────────────
local KeyRow = Instance.new("Frame", Main)
KeyRow.Size = UDim2.new(1,-28,0,36); KeyRow.Position = UDim2.new(0,14,0,134)
KeyRow.BackgroundTransparency = 1

local KeyInput = Instance.new("TextBox", KeyRow)
KeyInput.PlaceholderText = "Paste your key here…"
KeyInput.Size = UDim2.new(1,-84,1,0)
KeyInput.BackgroundColor3 = Color3.fromRGB(10,17,38); KeyInput.BorderSizePixel = 0
KeyInput.Font = Enum.Font.Code; KeyInput.TextSize = 11
KeyInput.TextColor3 = Color3.fromRGB(200,200,200); KeyInput.PlaceholderColor3 = Color3.fromRGB(70,80,110)
KeyInput.ClearTextOnFocus = false; KeyInput.Text = ""
mkCorner(8, KeyInput); mkPad(8, 0, KeyInput)
mkStroke(Color3.fromRGB(40,55,100), 1, KeyInput)

local AuthBtn = Instance.new("TextButton", KeyRow)
AuthBtn.Text = "Verify"; AuthBtn.Size = UDim2.new(0,76,1,0)
AuthBtn.Position = UDim2.new(1,-76,0,0)
AuthBtn.BackgroundColor3 = Color3.fromRGB(90,50,200); AuthBtn.BorderSizePixel = 0
AuthBtn.Font = Enum.Font.GothamBold; AuthBtn.TextSize = 12
AuthBtn.TextColor3 = Color3.fromRGB(255,255,255)
mkCorner(8, AuthBtn)

-- ── Divider ───────────────────────────────────────────────
local Divider = Instance.new("Frame", Main)
Divider.Size = UDim2.new(1,-28,0,1); Divider.Position = UDim2.new(0,14,0,180)
Divider.BackgroundColor3 = Color3.fromRGB(25,35,70); Divider.BorderSizePixel = 0

-- ── Button factory ────────────────────────────────────────
local BTN_DEFS = {
  { label="🎭  Get Role",      color=Color3.fromRGB(16,185,129),  key="getRoleBtn"   },
  { label="📜  Get Script",    color=Color3.fromRGB(96,165,250),  key="getScriptBtn" },
  { label="🔄  Reset HWID",    color=Color3.fromRGB(245,158,11),  key="resetHwidBtn" },
  { label="🔑  My Key",        color=Color3.fromRGB(167,139,250), key="myKeyBtn"     },
}

local BtnRefs = {}
local BTN_Y_START = 192
for i, def in ipairs(BTN_DEFS) do
  local btn = Instance.new("TextButton", Main)
  btn.Text = def.label
  btn.Size = UDim2.new(1,-28,0,44)
  btn.Position = UDim2.new(0,14,0, BTN_Y_START + (i-1)*52)
  btn.BackgroundColor3 = Color3.fromRGB(12,19,40)
  btn.BorderSizePixel  = 0
  btn.Font             = Enum.Font.GothamBold
  btn.TextSize         = 13
  btn.TextColor3       = def.color
  btn.TextXAlignment   = Enum.TextXAlignment.Left
  btn.AutoButtonColor  = false
  mkCorner(10, btn)
  mkStroke(def.color:Lerp(Color3.fromRGB(0,0,0),.55), 1.2, btn)
  mkPad(16, 0, btn)

  -- Hover tween
  btn.MouseEnter:Connect(function()
    TweenService:Create(btn, TweenInfo.new(.12),
      { BackgroundColor3 = def.color:Lerp(Color3.fromRGB(0,0,0),.75) }):Play()
  end)
  btn.MouseLeave:Connect(function()
    TweenService:Create(btn, TweenInfo.new(.12),
      { BackgroundColor3 = Color3.fromRGB(12,19,40) }):Play()
  end)

  BtnRefs[def.key] = btn
end

-- Footer
local Footer = Instance.new("TextLabel", Main)
Footer.Text = "AuthSystem • Secured"
Footer.Size = UDim2.new(1,0,0,22); Footer.Position = UDim2.new(0,0,1,-24)
Footer.BackgroundTransparency = 1; Footer.Font = Enum.Font.Gotham; Footer.TextSize = 10
Footer.TextColor3 = Color3.fromRGB(40,55,85)

-- Entry animation
Main.Position = UDim2.new(0.5,-170, -0.7, 0)
TweenService:Create(Main, TweenInfo.new(.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
  { Position = UDim2.new(0.5,-170, 0.5,-215) }):Play()

-- ── Button Logic ──────────────────────────────────────────

-- VERIFY key
AuthBtn.MouseButton1Click:Connect(function()
  local key = KeyInput.Text:gsub("%s+","")
  if key == "" then notifyErr("Enter your key first"); return end
  notifyInf("Verifying…"); AuthBtn.Active = false

  local data, err = postJSON("/api/script/validate", { key=key, hwid=HWID })
  AuthBtn.Active = true
  if err then notifyErr(err); setStatus(false, "Auth failed"); return end
  if not data.ok then notifyErr(data.error or "Rejected"); setStatus(false, "Auth failed"); return end

  authed   = true
  savedKey = key
  notifyOk("Authenticated as "..tostring(data.username))
  setStatus(true, "Authenticated — " .. tostring(data.username) .. " ("..tostring(data.role)..")")
end)

-- GET ROLE
BtnRefs.getRoleBtn.MouseButton1Click:Connect(function()
  if not authed then notifyErr("Verify your key first"); return end
  -- Trigger a server-side role assignment via validate endpoint
  -- (role info already returned on verify; here we just confirm it)
  notifyInf("Assigning role…")
  local data, err = postJSON("/api/script/validate", { key=savedKey, hwid=HWID })
  if err then notifyErr(err); return end
  if not data.ok then notifyErr(data.error); return end
  notifyOk("Role: " .. tostring(data.role) .. " — use /role in Discord to sync")
end)

-- GET SCRIPT
BtnRefs.getScriptBtn.MouseButton1Click:Connect(function()
  if not authed then notifyErr("Verify your key first"); return end
  notifyInf("Fetching script…")

  local data, err = postJSON("/api/script/fetch", { key=savedKey, hwid=HWID })
  if err then notifyErr(err); return end

  notifyOk("Script loaded (v" .. tostring(data.version) .. ")")
  -- Execute the wrapped script
  local fn, loadErr = loadstring(data.script)
  if not fn then notifyErr("Load error: " .. tostring(loadErr)); return end
  task.spawn(fn)
end)

-- RESET HWID
BtnRefs.resetHwidBtn.MouseButton1Click:Connect(function()
  if savedKey == "" then notifyErr("Enter your key first"); return end
  notifyInf("Resetting HWID…")

  local data, err = postJSON("/api/hwid/reset-self", { key=savedKey })
  if err then notifyErr(err); return end
  authed = false
  setStatus(false, "HWID cleared — re-verify to bind new device")
  notifyOk(data.message or "HWID cleared")
end)

-- MY KEY
BtnRefs.myKeyBtn.MouseButton1Click:Connect(function()
  if savedKey == "" then notifyErr("No key loaded yet"); return end
  -- Copy to clipboard (executor-specific)
  local copied = false
  if setclipboard then setclipboard(savedKey); copied = true
  elseif toclipboard then toclipboard(savedKey); copied = true end

  if copied then
    notifyOk("Key copied to clipboard!")
  else
    -- Show key in a small popup label
    notifyInf("Your key: " .. savedKey:sub(1,20) .. "…")
  end
end)
