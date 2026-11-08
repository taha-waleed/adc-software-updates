using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media.Animation;
using System.Windows.Threading;

namespace MediLabX.Desktop;
public partial class MainWindow : Window
{
 private const string Host = "medilabx.app";
 private readonly string _profile=Path.Combine(Diagnostics.Root,"profile");
 private readonly string _ui=Path.Combine(Diagnostics.Root,"ui");
 private readonly UpdateManager _updates;
 private bool _closing;
 private bool _ready;
 private readonly DispatcherTimer _updater=new(){Interval=TimeSpan.FromHours(6)};

 public MainWindow()
 {
  InitializeComponent();
  Diagnostics.Write("Original UI desktop shell 0.3.1 starting");
  _updates=new UpdateManager(_ui);
  Loaded+=OnLoaded;
  StateChanged+=(_,_)=>SendState();
  Closed+=(_,_)=>{_closing=true;_updater.Stop();Browser.Dispose();Diagnostics.Write("Window closed");};
  _updater.Tick+=async (_,_)=>await AutoUpdateCheckAsync();
 }
 private async void OnLoaded(object sender,RoutedEventArgs e)
 {
  try
  {
   Directory.CreateDirectory(_profile);
   Directory.CreateDirectory(_ui);
   _updates.SeedBundledUi(Path.Combine(AppContext.BaseDirectory,"assets"));
   LoadingText.Text="Preparing modern desktop interface…";
   Diagnostics.Write("Local UI prepared");
   var environment=await CoreWebView2Environment.CreateAsync(null,_profile);
   await Browser.EnsureCoreWebView2Async(environment);
   var core=Browser.CoreWebView2 ?? throw new InvalidOperationException("WebView2 core not initialized");
   core.Settings.AreDevToolsEnabled=false;
   core.Settings.AreDefaultContextMenusEnabled=false;
   core.Settings.IsZoomControlEnabled=false;
   core.Settings.IsStatusBarEnabled=false;
   core.Settings.IsPasswordAutosaveEnabled=false;
   core.Settings.IsGeneralAutofillEnabled=false;
   core.WebMessageReceived+=OnMessage;
   core.NavigationStarting+=(_,ev)=>{
    Diagnostics.Write("WebView navigation started: "+(ev.Uri?.Length>120?ev.Uri[..120]:ev.Uri));
    if(!Uri.TryCreate(ev.Uri,UriKind.Absolute,out var uri)||
       uri.Scheme!="https"||uri.Host!=Host)
    {
     ev.Cancel=true;
     OpenExternal(ev.Uri??"");
    }
   };
   core.NewWindowRequested+=(_,ev)=>{ev.Handled=true;OpenExternal(ev.Uri);};
   core.ProcessFailed+=(_,ev)=>{
     Diagnostics.Write("Browser process failed: "+ev.ProcessFailedKind);
     Dispatcher.BeginInvoke(()=>LoadingText.Text="Desktop renderer stopped. Restart MediLab X.");
   };
   await core.AddScriptToExecuteOnDocumentCreatedAsync(JsBridge.Script);
   core.SetVirtualHostNameToFolderMapping(Host,_ui,CoreWebView2HostResourceAccessKind.DenyCors);
   Browser.NavigationCompleted+=OnNavigationCompleted;
   LoadingText.Text="Opening MediLab X…";
   Browser.Source=new Uri($"https://{Host}/index.html?medilabDesktop=1");
   Diagnostics.Write("Navigating to bundled v10.0.11 HTML workspace");
   _updater.Start();
   await AutoUpdateCheckAsync();
  }
  catch(Exception ex)
  {
   Diagnostics.Write("FATAL startup: "+ex);
   LoadingText.Text="Unable to start MediLab X. See startup log.";
   MessageBox.Show("MediLab X could not open its desktop interface.\n\n"+ex.Message+"\n\nLog: "+Diagnostics.LogPath,
    "MediLab X",MessageBoxButton.OK,MessageBoxImage.Error);
  }
 }
 private async void OnNavigationCompleted(object? sender,CoreWebView2NavigationCompletedEventArgs e)
 {
  if(!e.IsSuccess){Diagnostics.Write("Navigation failure: "+e.WebErrorStatus);LoadingText.Text="Workspace did not load; check log.";return;}
  try
  {
   var state=await Browser.ExecuteScriptAsync("JSON.stringify({ready:document.readyState,title:document.title,body:document.body?.textContent?.length||0})");
   Diagnostics.Write("WebView navigation complete; DOM state: "+state[..Math.Min(state.Length,350)]);
   var check=await Browser.ExecuteScriptAsync("(document.body && document.body.children.length>0)");
   if(check!="true")throw new InvalidOperationException("MediLab workspace was empty");
   var polish=await InjectLoginDesignAsync();
   Diagnostics.Write("Desktop login design injection: "+polish);
   if(!polish.Contains("ml031-ready",StringComparison.Ordinal))throw new InvalidOperationException("Desktop login styling did not load");
   _ready=true;
   Browser.Visibility=Visibility.Visible;
   var fade=new DoubleAnimation(1,0,TimeSpan.FromMilliseconds(420));
   fade.Completed+=(_,_)=>LoadingView.Visibility=Visibility.Collapsed;
   LoadingView.BeginAnimation(OpacityProperty,fade);
   Diagnostics.Write("Original MediLab UI rendered; native bridge injected");
   if(Environment.GetEnvironmentVariable("MEDILAB_UI_LOGIN_SMOKE")=="1")await TestLoginFlowAsync();
  }
  catch(Exception ex){Diagnostics.Write("UI verification failed: "+ex);LoadingText.Text="Unable to verify workspace: "+ex.Message;}
 }
 private async Task<string> InjectLoginDesignAsync()
 {
  // WebView2 ExecuteScriptAsync serializes an async Promise to {} on some runtimes;
  // create the trusted assets synchronously, then poll for the onload completion flag.
  const string inject="""
  (()=>{
    const css=document.createElement('link');
    css.rel='stylesheet';css.href='/medilab-login-v031.css';
    document.head.appendChild(css);
    const js=document.createElement('script');
    js.src='/medilab-login-v031.js';
    document.head.appendChild(js);
    return 'queued';
  })()
  """;
  var queued=await Browser.ExecuteScriptAsync(inject);
  Diagnostics.Write("Login UI resource requests: "+queued);
  for(var i=0;i<20;i++)
  {
   var ready=await Browser.ExecuteScriptAsync("window.__ml031Ready === true ? 'ml031-ready' : 'not-ready'");
   if(ready.Contains("ml031-ready",StringComparison.Ordinal))return ready;
   await Task.Delay(150);
  }
  return "login-css-or-js-missing";
 }
 private async Task TestLoginFlowAsync()
 {
  // Only on CI's throwaway test profile, never on a customer profile.
  const string submit="""
  (()=>{
    try{
      const key='ahdc_software_v1';
      const saved=JSON.parse(localStorage.getItem(key)||'{}');
      if(!Array.isArray(saved.tests))saved.tests=[];
      saved.users=[{name:'CI Smoke Tester',username:'ci-smoke-user',password:'ci-only-temporary-password',role:'admin'}];
      localStorage.setItem(key,JSON.stringify(saved));
      window.ADCLoginTiles?.refresh?.();
      const tiles=Array.from(document.querySelectorAll('#adcUserTiles button'));
      const tile=tiles.find(x=>x.textContent.includes('CI Smoke Tester'))||tiles[0];
      tile?.click();
      const user=document.getElementById('loginUser'),pass=document.getElementById('loginPass'),form=document.getElementById('loginForm');
      if(!user||!pass||!form)return 'error:login-form-missing';
      user.value='ci-smoke-user';pass.value='ci-only-temporary-password';
      form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      return 'submitted';
    }catch(e){return 'error:'+String(e.message||e)}
  })()
  """;
  var submitted=await Browser.ExecuteScriptAsync(submit);
  Diagnostics.Write("CI login test action: "+submitted);
  if(!submitted.Contains("submitted",StringComparison.Ordinal))throw new InvalidOperationException("Test login form could not be submitted");
  await Task.Delay(2500);
  const string verify="""
  (()=>{
    const app=document.getElementById('app');
    const login=document.getElementById('adcWelcome');
    const splash=document.getElementById('startupSplash');
    const image=document.querySelector('#adcWelcomeEmblem img');
    const isAuthed=!!app?.classList.contains('authenticated');
    const loginHidden=!login||getComputedStyle(login).display==='none';
    return JSON.stringify({authenticated:isAuthed,overlayHidden:loginHidden,splashGone:!splash,logoLoaded:!!image?.naturalWidth,loginError:document.getElementById('loginError')?.textContent||''});
  })()
  """;
  var result=await Browser.ExecuteScriptAsync(verify);
  Diagnostics.Write("CI login transition checked: "+result);
  var jsonText=JsonSerializer.Deserialize<string>(result)??"{}";
  using var doc=JsonDocument.Parse(jsonText);
  var root=doc.RootElement;
  if(!root.GetProperty("authenticated").GetBoolean()||!root.GetProperty("overlayHidden").GetBoolean()||!root.GetProperty("splashGone").GetBoolean()||!root.GetProperty("logoLoaded").GetBoolean())
   throw new InvalidOperationException("Login to dashboard transition failed: "+jsonText);
  Diagnostics.Write("PASS: login to dashboard; no splash reset; heartbeat logo loaded");
 }
 private async Task AutoUpdateCheckAsync()
 {
  try
  {
   if(!_ready)return;
   var status=await _updates.CheckAsync();
   if(status.Available)Browser.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(new { @event="auto-update",payload=status.ToJs() }));
  }
  catch(Exception ex){Diagnostics.Write("Background update check failed: "+ex.GetType().Name);}
 }
 private void SendState()
 {
  if(!_ready)return;
  try{Browser.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(new { @event="window-state",payload=new{maximized=WindowState==WindowState.Maximized,minimized=WindowState==WindowState.Minimized}}));}
  catch{}
 }
 private async void OnMessage(object? sender,CoreWebView2WebMessageReceivedEventArgs args)
 {
  try
  {
   if(!Uri.TryCreate(args.Source,UriKind.Absolute,out var source)||source.Host!=Host||source.Scheme!="https")return;
   using var json=JsonDocument.Parse(args.WebMessageAsJson);
   var root=json.RootElement;
   var id=root.GetProperty("id").GetInt64();
   var method=root.GetProperty("method").GetString()??"";
   var parameters=root.TryGetProperty("args",out var a)?a:default;
   object result;
   try{result=await InvokeMethodAsync(method,parameters);}
   catch(Exception ex){Diagnostics.Write("Bridge failed ("+method+"): "+ex.GetType().Name);result=new{ok=false,error=ex.Message};}
   if(!_closing && Browser.CoreWebView2 is not null)
     Browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new{id,result}));
  }
  catch(Exception ex){Diagnostics.Write("Bridge message parsing error: "+ex.GetType().Name);}
 }
 private async Task<object> InvokeMethodAsync(string method,JsonElement args)
 {
  string Arg(int index)
  {
   if(args.ValueKind!=JsonValueKind.Array||args.GetArrayLength()<=index)return "";
   var item=args[index];return item.ValueKind==JsonValueKind.String?item.GetString()??"":item.ToString();
  }
  switch(method)
  {
   case "windowMinimize":WindowState=WindowState.Minimized;return new{ok=true};
   case "windowToggleMaximize":WindowState=WindowState==WindowState.Maximized?WindowState.Normal:WindowState.Maximized;SendState();return new{ok=true};
   case "windowClose":Close();return new{ok=true};
   case "windowAuthenticated":WindowState=WindowState.Maximized;SendState();return new{ok=true};
   case "windowLoggedOut":WindowState=WindowState.Normal;Width=1140;Height=770;return new{ok=true};
   case "windowReadyForLogin":return new{ok=true};
   case "beginDrag":BeginNativeDrag();return new{ok=true};
   case "restartApp":Browser.CoreWebView2?.Reload();return new{ok=true};
   case "updateSource":return new{ok=true,url=UpdateManager.ManifestUrl};
   case "saveUpdateSource":return Arg(0)==UpdateManager.ManifestUrl?new{ok=true}:new{ok=false,error="Only the trusted MediLab X update channel is supported."};
   case "checkOnline":case "checkForUpdate":return (await _updates.CheckAsync()).ToJs();
   case "installOnline":case "installUpdate":
    var version=await _updates.InstallAsync();
    if(version is null)return new{ok=false,error="No new verified HTML update is available."};
    Browser.CoreWebView2?.Reload();return new{ok=true,version,htmlOnly=true};
   case "rollbackUpdate":
    if(!_updates.Rollback())return new{ok=false,error="No earlier HTML copy is available."};
    Browser.CoreWebView2?.Reload();return new{ok=true};
   case "updateSuccessNotice":return new{ok=true,message="MediLab X HTML edition"};
   case "openPrintPreview":
    if(Arg(0).Length>4_000_000)return new{ok=false,error="Print job is too large."};
    return await PrintPreviewWindow.ShowAsync(this,Arg(0),_profile);
   case "openWhatsAppDesktop":return OpenWhatsApp(Arg(0),Arg(1));
   case "geminiStatus":return new{ok=false,configured=false,error="Gemini integration is not enabled in this preview."};
   case "geminiConfigure":return new{ok=false,error="Gemini configuration is disabled for clinical data safety in this preview."};
   case "geminiAsk":case "geminiChat":return new{ok=false,error="Gemini integration is not enabled in this preview."};
   default:return new{ok=false,error="Unsupported desktop operation: "+method};
  }
 }
 private static object OpenWhatsApp(string input,string message)
 {
  var digits=new string((input??"").Where(char.IsDigit).ToArray());
  if(digits.StartsWith("0")&&digits.Length==11)digits="92"+digits[1..];
  if(digits.Length<10||digits.Length>15)return new{ok=false,error="Check the patient's WhatsApp phone number."};
  try
  {
   Process.Start(new ProcessStartInfo("whatsapp://send?phone="+digits+"&text="+Uri.EscapeDataString(message)){UseShellExecute=true});
   return new{ok=true};
  }
  catch{return new{ok=false,error="WhatsApp Desktop could not be opened. Install the Windows WhatsApp application first."};}
 }
 private static void OpenExternal(string url)
 {
  try
  {
   if(Uri.TryCreate(url,UriKind.Absolute,out var uri)&&(uri.Scheme=="https"||uri.Scheme=="http"))
     Process.Start(new ProcessStartInfo(uri.AbsoluteUri){UseShellExecute=true});
  }
  catch{}
 }
 [DllImport("user32.dll")]private static extern bool ReleaseCapture();
 [DllImport("user32.dll",CharSet=CharSet.Auto)]private static extern IntPtr SendMessage(IntPtr hwnd,int msg,IntPtr wp,IntPtr lp);
 private void BeginNativeDrag()
 {
  try
  {
   var hwnd=new System.Windows.Interop.WindowInteropHelper(this).Handle;
   if(hwnd!=IntPtr.Zero){ReleaseCapture();SendMessage(hwnd,0xA1,new IntPtr(2),IntPtr.Zero);}
  }catch{}
 }
}