using System;
using System.IO;
using System.Windows;
namespace MediLabX.Desktop;
public partial class App : Application
{
 protected override void OnStartup(StartupEventArgs e)
 {
  base.OnStartup(e);
  DispatcherUnhandledException += (_, ex) => {
   Diagnostics.Write("UI failure: " + ex.Exception);
   MessageBox.Show("MediLab X could not finish opening.\n" + ex.Exception.Message + "\n\nLog: " + Diagnostics.LogPath,
                  "MediLab X Startup Error", MessageBoxButton.OK, MessageBoxImage.Error);
   ex.Handled = true;
  };
  AppDomain.CurrentDomain.UnhandledException += (_, ex) => Diagnostics.Write("Unhandled exception: " + ex.ExceptionObject);
  TaskScheduler.UnobservedTaskException += (_, ex) => {Diagnostics.Write("Async exception: "+ex.Exception); ex.SetObserved();};
 }
}