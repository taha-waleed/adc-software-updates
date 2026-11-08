using System.Windows;
using System.Windows.Documents;
using System.Windows.Controls;
using System.Windows.Media;
using MediLabX.Native.Models;
namespace MediLabX.Native.Services;
public sealed class PrintService {
 private static double Cm(decimal cm)=> (double)cm*96.0/2.54;
 private static void Print(string title,IEnumerable<(string text,bool heading)> lines,CentreSettings config,bool withHeading){
  var doc=new FlowDocument{PageWidth=Cm(21),PageHeight=Cm(29.7m),ColumnWidth=Cm(18),FontFamily=new FontFamily("Segoe UI"),FontSize=12,Foreground=Brushes.Black};
  // Preprinted letterhead safe zone: 6.5cm top and 5cm bottom, defaults stay locked.
  doc.PagePadding=new Thickness(Cm(1.6m),Cm(config.HeaderCm),Cm(1.6m),Cm(config.FooterCm));
  if(withHeading){doc.Blocks.Add(new Paragraph(new Run(config.Name)){FontWeight=FontWeights.Bold,FontSize=17,TextAlignment=TextAlignment.Center,Margin=new Thickness(0,0,0,4)});doc.Blocks.Add(new Paragraph(new Run(config.Address)){TextAlignment=TextAlignment.Center,FontSize=9});}
  doc.Blocks.Add(new Paragraph(new Run(title)){FontSize=16,FontWeight=FontWeights.Bold,TextAlignment=TextAlignment.Center,Margin=new Thickness(0,9,0,18)});
  foreach(var (text,head) in lines)doc.Blocks.Add(new Paragraph(new Run(text)){FontWeight=head?FontWeights.SemiBold:FontWeights.Normal,Margin=new Thickness(0,4,0,7),TextAlignment=TextAlignment.Left});
  var dialog=new PrintDialog();if(dialog.ShowDialog()!=true)return;
  doc.PageWidth=dialog.PrintableAreaWidth;doc.PageHeight=dialog.PrintableAreaHeight;
  dialog.PrintDocument(((IDocumentPaginatorSource)doc).DocumentPaginator,title);
 }
 public void Receipt(Patient p,CentreSettings s){var lines=new List<(string,bool)>{($"Receipt: {p.Receipt}   Date: {p.Date}",true),($"Patient: {p.Name}   MR: {p.Mr}",false),($"Tests: {string.Join(", ",p.Tests.Select(t=>t.Name))}",false),($"Gross: Rs {p.Subtotal:N0} | Discount: Rs {p.Discount:N0}",false),($"Net: Rs {p.Net:N0} | Received: Rs {p.Received:N0}",true),($"Balance: Rs {p.Balance:N0}",true)};Print("PATIENT RECEIPT",lines,s,false);}
 public void Report(Patient? patient,Report r,CentreSettings s){Print("RADIOLOGY REPORT",new[]{($"Patient: {patient?.Name??"Unknown"}   Date: {r.Date}",true),($"MR: {patient?.Mr}   Modality: {r.Modality}",false),("FINDINGS",true),(r.Findings,false),("IMPRESSION",true),(r.Impression,false),($"Approved by: {r.ApprovedBy}",false)},s,r.WithHeading);}
 public void Experience(Employee e,string text,CentreSettings s,bool heading){Print("EXPERIENCE CERTIFICATE",new[]{($"Date: {DateTime.Today:dd MMMM yyyy}",false),("To Whom It May Concern,",false),($"This is to certify that {e.Name} served as {e.Position} in {e.Department} from {e.Joined} to {e.Left}.",false),(text,false),("Authorized Signatory / Stamp: ____________________",false)},s,heading);}
 public void Salary(Employee e,SalarySlip slip,CentreSettings s,bool heading){Print("SALARY SLIP",new[]{($"Employee: {e.Name}  Position: {e.Position}",true),($"Salary month: {slip.Month}",false),($"Gross salary: Rs {slip.Gross:N0}",false),($"Deductions: Rs {slip.Deductions:N0}",false),($"Net payable: Rs {slip.Net:N0}",true),("Authorized signature: ____________________",false)},s,heading);}
 public void Leave(Employee e,LeaveRecord leave,CentreSettings s,bool heading){Print("LEAVE RECORD",new[]{($"Employee: {e.Name}",true),($"From: {leave.Start}  To: {leave.End}",false),($"Reason: {leave.Reason}",false),($"Status: {leave.Status}",true)},s,heading);}
}