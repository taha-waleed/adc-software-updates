using MediLabX.Native.Models;
using MediLabX.Native.Services;
using Microsoft.Win32;
using System.Diagnostics;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;
using System.Windows.Threading;
namespace MediLabX.Native;
public partial class MainWindow : Window {
 private readonly Store store=new();
 private readonly PrintService printer=new();
 private readonly BriefEngine brief;
 private readonly NoticeEngine notices;
 private readonly DispatcherTimer tick=new(){Interval=TimeSpan.FromMilliseconds(45)};
 private readonly DispatcherTimer rotate=new(){Interval=TimeSpan.FromSeconds(19)};
 private readonly DispatcherTimer alerts=new(){Interval=TimeSpan.FromMinutes(63)};
 private LocalUser? current;
 private string page="Dashboard";
 private bool history;
 private readonly string[] pages=["Dashboard","Reception","Patients & Receipts","Radiology Reports","Daily Summary","Expenses","Total Earning","Radiology Rate List","Laboratory","Admin & Users","Settings","About"];
 public MainWindow(){InitializeComponent();brief=new(store);notices=new(store);Loaded+=OnLoaded;tick.Tick+=(_,_)=>UpdateClock();rotate.Tick+=(_,_)=>ShowBrief();alerts.Tick+=(_,_)=>{notices.Evaluate();RefreshNotices();};BuildNavigation();ApplyTheme(store.Settings.DarkMode);}
 private async void OnLoaded(object sender,RoutedEventArgs e){tick.Start();rotate.Start();UpdateClock();ShowBrief();var fade=new DoubleAnimation(1,.12,TimeSpan.FromMilliseconds(650)){BeginTime=TimeSpan.FromSeconds(2.35)};SplashOverlay.BeginAnimation(OpacityProperty,fade);await Task.Delay(3000);SplashOverlay.Visibility=Visibility.Collapsed;var users=store.All<LocalUser>("users");if(users.Count==0){LoginError.Text="First launch: choose an Admin password (at least 10 characters) and select Sign in.";LoginPassword.Focus();}else{LoginPassword.Focus();} }
 private void Minimize_Click(object sender,RoutedEventArgs e)=>WindowState=WindowState.Minimized;
 private void Maximize_Click(object sender,RoutedEventArgs e)=>WindowState=WindowState==WindowState.Maximized?WindowState.Normal:WindowState.Maximized;
 private void Close_Click(object sender,RoutedEventArgs e)=>Close();
 private void Login_Click(object sender,RoutedEventArgs e){var name=LoginName.Text.Trim();var password=LoginPassword.Password;
  if(store.All<LocalUser>("users").Count==0){if(!name.Equals("Admin",StringComparison.OrdinalIgnoreCase)||password.Length<10){LoginError.Text="First Admin username must be Admin; choose a password with 10+ characters.";return;}var first=new LocalUser{UserName="Admin",DisplayName="Admin",Role="Admin",PasswordHash=Security.Hash(password)};store.Put("users",first.Id,first);current=first;}
  else{current=Security.Login(store,name,password);if(current is null){LoginError.Text="Incorrect account or password.";LoginPassword.Clear();return;}}
  LoginOverlay.Visibility=Visibility.Collapsed;SignedInText.Text=current.DisplayName+"  ·  "+current.Role;WindowState=WindowState.Maximized;BuildNavigation();OpenPage("Dashboard");notices.Evaluate();RefreshNotices();alerts.Start();
 }
 private void SignOut_Click(object sender,RoutedEventArgs e){current=null;LoginPassword.Clear();LoginOverlay.Visibility=Visibility.Visible;WindowState=WindowState.Normal;Width=1080;Height=760;}
 private void BuildNavigation(){Navigation.Children.Clear();foreach(var p in pages){var b= new Button{Content=(p switch{"Dashboard"=>"▦  ","Reception"=>"⊞  ","Patients & Receipts"=>"♧  ","Radiology Reports"=>"▤  ","Daily Summary"=>"▦  ","Expenses"=>"▱  ","Total Earning"=>"▥  ","Radiology Rate List"=>"☷  ","Laboratory"=>"⚗  ","Admin & Users"=>"♙  ","Settings"=>"⚙  ",_=>"ⓘ  "})+p,Tag=p,Height=43,HorizontalContentAlignment=HorizontalAlignment.Left,Padding=new Thickness(14,7,5,7),Foreground=Brushes.White,Background=new SolidColorBrush(p==page?Color.FromRgb(36,100,176):Color.FromArgb(0,0,0,0)),BorderBrush=new SolidColorBrush(p==page?Color.FromRgb(100,157,250):Color.FromArgb(0,0,0,0)),Margin=new Thickness(0,1,0,1)};b.Click+=(_,_)=>OpenPage(p);b.IsEnabled=current is null||Security.CanVisit(current,p);Navigation.Children.Add(b);}}
 private void OpenPage(string title){if(current is null||!Security.CanVisit(current,title)){MessageBox.Show("Access denied for this account.");return;}page=title;PageTitle.Text=title;PageSubtitle.Text=title switch{"Dashboard"=>"Centre activity at a glance","Reception"=>"Register patients and collect payments","Patients & Receipts"=>"Search, edit and reprint existing records","Radiology Reports"=>"Write, approve and print reports","Daily Summary"=>"Today’s visits and collections","Expenses"=>"Operating cost and cash balances","Total Earning"=>"Reports and patient-wise collection records","Radiology Rate List"=>"CT, X-Ray and Ultrasound prices","Laboratory"=>"Reagent inventory, expiry and movement history","Admin & Users"=>"Accounts, employees, leave and salary","Settings"=>"Appearance, print margins, doctors and backup",_=>"Product information"};
  PageContent.Content=title switch{"Dashboard"=>Dashboard(),"Reception"=>Reception(),"Patients & Receipts"=>Patients(),"Radiology Reports"=>Reports(),"Daily Summary"=>Daily(),"Expenses"=>Expenses(),"Total Earning"=>Earnings(),"Radiology Rate List"=>Rates(),"Laboratory"=>Laboratory(),"Admin & Users"=>Admin(),"Settings"=>Settings(),_=>About()};BuildNavigation();}
 private void NewPatient_Click(object sender,RoutedEventArgs e)=>OpenPage("Reception");
 private void Clock_Click(object sender,RoutedEventArgs e){CalendarPopup.IsOpen=!CalendarPopup.IsOpen;}
 private void CalendarControl_SelectedDatesChanged(object sender,SelectionChangedEventArgs e){if(CalendarPopup is not null)CalendarPopup.IsOpen=false;}
 private void UpdateClock(){var d=DateTime.Now;ClockTime.Text=d.ToString("hh:mm:ss tt",CultureInfo.InvariantCulture);ClockDate.Text=d.ToString("ddd, dd MMM yyyy",CultureInfo.InvariantCulture).ToUpperInvariant();HourHand.Angle=((d.Hour%12)+(d.Minute/60.0))*30;MinuteHand.Angle=(d.Minute+d.Second/60.0)*6;SecondHand.Angle=(d.Second+d.Millisecond/1000.0)*6;}
 private void ShowBrief(){BriefText.Text=brief.Next();var animation=new DoubleAnimation(0.4,1,TimeSpan.FromMilliseconds(650));BriefText.BeginAnimation(OpacityProperty,animation);}
 private void Notifications_Click(object sender,RoutedEventArgs e){history=false;RefreshNotices();NotificationPopup.IsOpen=true;}
 private void History_Click(object sender,RoutedEventArgs e){history=!history;RefreshNotices();}
 private void MarkRead_Click(object sender,RoutedEventArgs e){notices.MarkAllRead();history=false;RefreshNotices();}
 private void RefreshNotices(){if(NoticeList is null)return;var data=notices.List(history);NoticeList.ItemsSource=data;UnreadCount.Text=notices.List(false).Count+" unread";NotificationsTitle.Text=history?"Notification History":"Notifications";HistoryButton.Content=history?"Back to active":"Notification history";}
 private static void Info(string text)=>MessageBox.Show(text,"MediLab X",MessageBoxButton.OK,MessageBoxImage.Information);
 private static void Error(Exception e)=>MessageBox.Show(e.Message,"MediLab X",MessageBoxButton.OK,MessageBoxImage.Warning);
 private static decimal Dec(string? text)=>decimal.TryParse(text,NumberStyles.Any,CultureInfo.CurrentCulture,out var d)?d:0;
 private static string Today=>DateTime.Today.ToString("yyyy-MM-dd");
 private static TextBlock Text(string t,int size=12,bool bold=false){return new TextBlock{Text=t,FontSize=size,FontWeight=bold?FontWeights.Bold:FontWeights.Normal,Margin=new Thickness(1,4,0,5),TextWrapping=TextWrapping.Wrap};}
 private static StackPanel Column(int gap=0)=>new(){Orientation=Orientation.Vertical,Margin=new Thickness(0,0,0,gap)};
 private static StackPanel Row()=>new(){Orientation=Orientation.Horizontal,Margin=new Thickness(0,5,0,7)};
 private static Button Action(string label,Action call,bool primary=false){var b=new Button{Content=label,Margin=new Thickness(0,2,8,2),MinWidth=100};if(primary){b.Background=new SolidColorBrush(Color.FromRgb(38,117,224));b.Foreground=Brushes.White;b.BorderBrush=b.Background;}b.Click+=(_,_)=>call();return b;}
 private static TextBox Field(StackPanel holder,string label,string value="",int max=200){holder.Children.Add(Text(label,11,true));var t=new TextBox{Text=value,MaxLength=max,MinWidth=140};holder.Children.Add(t);return t;}
 private static ComboBox Select(StackPanel holder,string label,IEnumerable<string> choices,string? initial=null){holder.Children.Add(Text(label,11,true));var cb=new ComboBox{MinWidth=165,ItemsSource=choices.ToList()};cb.SelectedItem=initial??cb.Items.Cast<string>().FirstOrDefault();holder.Children.Add(cb);return cb;}
 private static CheckBox Check(StackPanel holder,string text,bool enabled=false){var box=new CheckBox{Content=text,IsChecked=enabled,Margin=new Thickness(0,8,0,8)};holder.Children.Add(box);return box;}
 private static Border Card(UIElement child,string? heading=null){var p=new StackPanel{Margin=new Thickness(18,14,18,16)};if(heading is not null)p.Children.Add(Text(heading,17,true));p.Children.Add(child);return new Border{Background=(Brush)Application.Current.Resources["Surface"],BorderBrush=(Brush)Application.Current.Resources["BorderBrushTheme"],BorderThickness=new Thickness(1),CornerRadius=new CornerRadius(17),Margin=new Thickness(0,0,0,14),Child=p};}
 private static DataGrid GridView(object rows,int height=340){return new DataGrid{ItemsSource=rows as System.Collections.IEnumerable,Height=height,CanUserAddRows=false,CanUserDeleteRows=false,AutoGenerateColumns=true,SelectionUnit=DataGridSelectionUnit.FullRow,HorizontalAlignment=HorizontalAlignment.Stretch};}
 private void SaveAndRefresh<T>(string bucket,string id,T value,string message){try{store.Put(bucket,id,value);Info(message);OpenPage(page);}catch(Exception e){Error(e);}}
 private void ApplyTheme(bool dark){var colors=dark?new Dictionary<string,string>{{"AppBackground","#101927"},{"Surface","#1D2B41"},{"SurfaceSoft","#263852"},{"TextPrimary","#F2F6FF"},{"TextSecondary","#B1C0D7"},{"BorderBrushTheme","#334B68"},{"NavBackground","#121D3E"},{"AccentSoft","#233F66"}}:new Dictionary<string,string>{{"AppBackground","#F0F4FB"},{"Surface","#FFFFFF"},{"SurfaceSoft","#F5F8FE"},{"TextPrimary","#1B2B45"},{"TextSecondary","#63748D"},{"BorderBrushTheme","#DBE5F2"},{"NavBackground","#172758"},{"AccentSoft","#E3EEFF"}};
  foreach(var pair in colors){var brush=(SolidColorBrush)Application.Current.Resources[pair.Key];brush.Color=(Color)ColorConverter.ConvertFromString(pair.Value)!;}if(current is not null)OpenPage(page);
 }
}