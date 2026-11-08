using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;

namespace MediLabX.Native;

public partial class App : Application
{
    public App()
    {
        DispatcherUnhandledException += (_, e) =>
        {
            StartupDiagnostics.Fatal("WPF dispatcher exception", e.Exception);
            e.Handled = true;
            Shutdown(1);
        };
        AppDomain.CurrentDomain.UnhandledException += (_, e) =>
        {
            if (e.ExceptionObject is Exception ex)
                StartupDiagnostics.Fatal("Unhandled process exception", ex);
        };
        TaskScheduler.UnobservedTaskException += (_, e) =>
        {
            StartupDiagnostics.Write("Unobserved background exception", e.Exception.GetBaseException().Message);
            e.SetObserved();
        };
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        ShutdownMode = ShutdownMode.OnExplicitShutdown;
        StartupDiagnostics.Write("WPF startup entered");
        var bootstrap = new Window
        {
            Title = "MediLab X — Starting",
            Width = 470,
            Height = 240,
            MinWidth = 470,
            MinHeight = 240,
            ResizeMode = ResizeMode.NoResize,
            WindowStartupLocation = WindowStartupLocation.CenterScreen,
            Background = new SolidColorBrush(Color.FromRgb(23, 37, 78)),
            ShowInTaskbar = true,
            Content = new StackPanel
            {
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                Children =
                {
                    new TextBlock {Text = "MediLab X", Foreground = Brushes.White, FontSize = 30, FontWeight = FontWeights.Bold, HorizontalAlignment = HorizontalAlignment.Center},
                    new TextBlock {Text = "Preparing native desktop workspace…", Foreground = new SolidColorBrush(Color.FromRgb(176, 208, 240)), FontSize = 13, Margin = new Thickness(0, 17, 0, 0), HorizontalAlignment = HorizontalAlignment.Center},
                    new ProgressBar { IsIndeterminate = true, Width = 220, Height = 5, Margin = new Thickness(0, 22, 0, 0) },
                    new TextBlock {Text = "A project by Taha Waleed", Foreground = new SolidColorBrush(Color.FromRgb(154, 184, 220)), FontSize = 11, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 22, 0, 0)}
                }
            }
        };
        MainWindow = bootstrap;
        bootstrap.Closed += (_, _) => { if (MainWindow == bootstrap) Shutdown(); };
        bootstrap.Show();
        StartupDiagnostics.Write("Bootstrap window shown");
        Dispatcher.BeginInvoke(new Action(() =>
        {
            try
            {
                StartupDiagnostics.Write("Constructing main window");
                var main = new MainWindow();
                if (Environment.GetEnvironmentVariable("MEDILABX_STARTUP_THEME_TEST") == "1")
                {
                    main.ValidateThemeTransitions();
                    StartupDiagnostics.Write("Light/dark theme transition probe passed");
                }
                main.Loaded += (_, _) => StartupDiagnostics.Write("Main window loaded");
                main.ContentRendered += (_, _) => StartupDiagnostics.Write("Main window rendered");
                main.Show();
                StartupDiagnostics.Write("Main window Show() returned");
                MainWindow = main;
                ShutdownMode = ShutdownMode.OnMainWindowClose;
                bootstrap.Close();
            }
            catch (Exception ex)
            {
                StartupDiagnostics.Fatal("Opening main window", ex);
                Shutdown(1);
            }
        }), DispatcherPriority.Background);
    }
}